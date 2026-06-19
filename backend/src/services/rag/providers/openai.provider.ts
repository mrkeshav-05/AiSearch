import axios from 'axios';
import type { EmbeddingProvider } from './embedding.interface';
import type { LLMProvider, ChatMessage, LLMOptions, StreamChunk } from './llm.interface';

const OPENAI_BASE = 'https://api.openai.com/v1';

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 5,
  initialDelay = 1000,
  maxDelay = 16000
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

      if (attempt > retries || !isRateLimit) {
        throw error;
      }
      
      const delay = Math.min(initialDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
      console.warn(`[OpenAIEmbeddingProvider] Rate limited (429). Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ── OpenAI Embedding Provider ─────────────────────────────────────────────────
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimension = parseInt(process.env.EMBEDDING_DIM || '1536', 10);

  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is required for OpenAI embedding provider');
    this.apiKey = key;
    this.model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  private headers() {
    return { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  async embed(text: string): Promise<number[]> {
    const { data } = await retryWithBackoff(() => axios.post(
      `${OPENAI_BASE}/embeddings`,
      { input: text, model: this.model },
      { headers: this.headers() }
    ));
    return data.data[0].embedding as number[];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const { data } = await retryWithBackoff(() => axios.post(
      `${OPENAI_BASE}/embeddings`,
      { input: texts, model: this.model },
      { headers: this.headers() }
    ));
    return (data.data as { embedding: number[] }[])
      .sort((a, b) => (data.data.indexOf(a) - data.data.indexOf(b)))
      .map((d) => d.embedding);
  }
}

// ── OpenAI LLM Provider ────────────────────────────────────────────────────────
export class OpenAILLMProvider implements LLMProvider {
  readonly name = 'openai';

  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is required for OpenAI LLM provider');
    this.apiKey = key;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  private headers() {
    return { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  async chat(messages: ChatMessage[], opts?: LLMOptions): Promise<string> {
    const { data } = await axios.post(
      `${OPENAI_BASE}/chat/completions`,
      {
        model: this.model,
        messages,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 2048,
      },
      { headers: this.headers() }
    );
    return data.choices[0].message.content as string;
  }

  async *chatStream(messages: ChatMessage[], opts?: LLMOptions): AsyncGenerator<StreamChunk> {
    const response = await axios.post(
      `${OPENAI_BASE}/chat/completions`,
      {
        model: this.model,
        messages,
        temperature: opts?.temperature ?? 0.3,
        max_tokens: opts?.maxTokens ?? 2048,
        stream: true,
      },
      { headers: this.headers(), responseType: 'stream' }
    );

    let buffer = '';
    for await (const rawChunk of response.data) {
      buffer += rawChunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') { yield { text: '', done: true }; return; }
        try {
          const parsed = JSON.parse(payload);
          const text = parsed.choices?.[0]?.delta?.content ?? '';
          if (text) yield { text, done: false };
        } catch { /* ignore malformed lines */ }
      }
    }
    yield { text: '', done: true };
  }
}
