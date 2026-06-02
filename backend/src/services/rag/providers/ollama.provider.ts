import axios from 'axios';
import type { EmbeddingProvider } from './embedding.interface';
import type { LLMProvider, ChatMessage, LLMOptions, StreamChunk } from './llm.interface';

// ── Ollama Embedding Provider ─────────────────────────────────────────────────
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'ollama';
  readonly dimension = parseInt(process.env.EMBEDDING_DIM || '768', 10);

  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    this.model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
  }

  async embed(text: string): Promise<number[]> {
    const { data } = await axios.post(`${this.baseUrl}/api/embed`, {
      model: this.model,
      input: text,
    });
    return data.embeddings[0] as number[];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const { data } = await axios.post(`${this.baseUrl}/api/embed`, {
      model: this.model,
      input: texts,
    });
    return data.embeddings as number[][];
  }
}

// ── Ollama LLM Provider ────────────────────────────────────────────────────────
export class OllamaLLMProvider implements LLMProvider {
  readonly name = 'ollama';

  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  async chat(messages: ChatMessage[], opts?: LLMOptions): Promise<string> {
    const { data } = await axios.post(`${this.baseUrl}/api/chat`, {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: opts?.temperature ?? 0.3,
        num_predict: opts?.maxTokens ?? 2048,
      },
    });
    return data.message.content as string;
  }

  async *chatStream(messages: ChatMessage[], opts?: LLMOptions): AsyncGenerator<StreamChunk> {
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: this.model,
        messages,
        stream: true,
        options: {
          temperature: opts?.temperature ?? 0.3,
          num_predict: opts?.maxTokens ?? 2048,
        },
      },
      { responseType: 'stream' }
    );

    let buffer = '';
    for await (const rawChunk of response.data) {
      buffer += rawChunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const text = parsed.message?.content ?? '';
          if (text) yield { text, done: false };
          if (parsed.done) { yield { text: '', done: true }; return; }
        } catch { /* ignore malformed lines */ }
      }
    }
    yield { text: '', done: true };
  }
}
