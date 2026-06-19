import axios from 'axios';
import type { EmbeddingProvider } from './embedding.interface';
import type { LLMProvider, ChatMessage, LLMOptions, StreamChunk } from './llm.interface';

const GROQ_BASE = 'https://api.groq.com/openai/v1';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 4,
  initialDelay = 800,
  maxDelay = 12000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const status = error?.response?.status || error?.status;
      const isRateLimit =
        status === 429 ||
        String(error).includes('429') ||
        String(error?.message).includes('429') ||
        String(error?.message).toLowerCase().includes('quota') ||
        String(error?.message).toLowerCase().includes('rate limit') ||
        String(error?.message).toLowerCase().includes('too many requests');

      if (attempt > retries || !isRateLimit) throw error;

      const delay = Math.min(initialDelay * Math.pow(2, attempt) + Math.random() * 500, maxDelay);
      console.warn(`[GroqProvider] Rate limited. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ── NOTE: Groq does NOT expose an embeddings endpoint. ────────────────────────
// This class is kept as a placeholder but will throw on construction so the
// factory never accidentally routes embeddings here.
export class GroqEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'groq';
  readonly dimension = 768;

  constructor() {
    throw new Error(
      'Groq does not support an embeddings API. Use EMBEDDING_PROVIDER=gemini or openai instead.'
    );
  }

  embed(_text: string): Promise<number[]> { return Promise.resolve([]); }
  embedBatch(_texts: string[]): Promise<number[][]> { return Promise.resolve([]); }
}

// ── Groq LLM Provider ──────────────────────────────────────────────────────────
// Groq provides an OpenAI-compatible chat completions API (supports streaming).
// Default model: llama-3.3-70b-versatile (fast + high quality)
export class GroqLLMProvider implements LLMProvider {
  readonly name = 'groq';

  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is required for GroqLLMProvider');
    this.apiKey = key;
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /** Convert LLM interface messages → OpenAI-compatible format (Groq is fully compatible). */
  private toOpenAIMessages(messages: ChatMessage[]) {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  // ── Non-streaming ────────────────────────────────────────────────────────────
  async chat(messages: ChatMessage[], opts?: LLMOptions): Promise<string> {
    const { data } = await retryWithBackoff(() =>
      axios.post(
        `${GROQ_BASE}/chat/completions`,
        {
          model: this.model,
          messages: this.toOpenAIMessages(messages),
          temperature: opts?.temperature ?? 0.3,
          max_tokens: opts?.maxTokens ?? 4096,
          stream: false,
        },
        { headers: this.headers() }
      )
    );
    return (data.choices[0]?.message?.content as string) ?? '';
  }

  // ── Streaming ────────────────────────────────────────────────────────────────
  async *chatStream(messages: ChatMessage[], opts?: LLMOptions): AsyncGenerator<StreamChunk> {
    const res = await retryWithBackoff(() =>
      axios.post(
        `${GROQ_BASE}/chat/completions`,
        {
          model: this.model,
          messages: this.toOpenAIMessages(messages),
          temperature: opts?.temperature ?? 0.3,
          max_tokens: opts?.maxTokens ?? 4096,
          stream: true,
        },
        {
          headers: this.headers(),
          responseType: 'stream',
        }
      )
    );

    const stream = res.data as NodeJS.ReadableStream;
    let buffer = '';

    for await (const rawChunk of stream) {
      buffer += (rawChunk as Buffer).toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';          // keep incomplete last line

      for (const line of lines) {
        const trimmed = line.replace(/^data:\s*/, '').trim();
        if (!trimmed || trimmed === '[DONE]') {
          if (trimmed === '[DONE]') yield { text: '', done: true };
          continue;
        }

        try {
          const parsed = JSON.parse(trimmed) as {
            choices: { delta?: { content?: string }; finish_reason?: string | null }[];
          };
          const delta = parsed.choices[0]?.delta?.content ?? '';
          const done = parsed.choices[0]?.finish_reason === 'stop';

          if (delta) yield { text: delta, done: false };
          if (done) { yield { text: '', done: true }; return; }
        } catch {
          // malformed chunk — skip
        }
      }
    }

    yield { text: '', done: true };
  }
}
