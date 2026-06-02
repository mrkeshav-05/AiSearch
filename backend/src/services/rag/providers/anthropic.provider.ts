import axios from 'axios';
import type { LLMProvider, ChatMessage, LLMOptions, StreamChunk } from './llm.interface';

/**
 * Claude (Anthropic) LLM-only provider.
 * Anthropic does not offer public embedding endpoints, so only LLMProvider is implemented.
 */
export class AnthropicLLMProvider implements LLMProvider {
  readonly name = 'anthropic';

  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY is required for Anthropic LLM provider');
    this.apiKey = key;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  private headers() {
    return {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }

  /** Extract system message + convert remaining to Anthropic message format. */
  private normalise(messages: ChatMessage[]) {
    const system = messages.find((m) => m.role === 'system')?.content ?? '';
    const msgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    return { system, msgs };
  }

  async chat(messages: ChatMessage[], opts?: LLMOptions): Promise<string> {
    const { system, msgs } = this.normalise(messages);
    const { data } = await axios.post(
      `${this.baseUrl}/messages`,
      {
        model: this.model,
        max_tokens: opts?.maxTokens ?? 2048,
        temperature: opts?.temperature ?? 0.3,
        ...(system ? { system } : {}),
        messages: msgs,
      },
      { headers: this.headers() }
    );
    return data.content[0].text as string;
  }

  async *chatStream(messages: ChatMessage[], opts?: LLMOptions): AsyncGenerator<StreamChunk> {
    const { system, msgs } = this.normalise(messages);
    const response = await axios.post(
      `${this.baseUrl}/messages`,
      {
        model: this.model,
        max_tokens: opts?.maxTokens ?? 2048,
        temperature: opts?.temperature ?? 0.3,
        ...(system ? { system } : {}),
        messages: msgs,
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
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text ?? '';
            if (text) yield { text, done: false };
          } else if (parsed.type === 'message_stop') {
            yield { text: '', done: true };
            return;
          }
        } catch { /* ignore malformed lines */ }
      }
    }
    yield { text: '', done: true };
  }
}
