import { GoogleGenerativeAI } from '@google/generative-ai';
import type { EmbeddingProvider } from './embedding.interface';
import type { LLMProvider, ChatMessage, LLMOptions, StreamChunk } from './llm.interface';

// ── Gemini Embedding Provider ─────────────────────────────────────────────────
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini';
  readonly dimension = parseInt(process.env.EMBEDDING_DIM || '768', 10);

  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY is required for Gemini embedding provider');
    this.client = new GoogleGenerativeAI(key);
    // text-embedding-004 produces 768-dim embeddings
    this.model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  }

  async embed(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Gemini supports batch embedding
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await model.batchEmbedContents({
      requests: texts.map((t) => ({ content: { role: 'user', parts: [{ text: t }] } })),
    });
    return result.embeddings.map((e) => e.values);
  }
}

// ── Gemini LLM Provider ────────────────────────────────────────────────────────
export class GeminiLLMProvider implements LLMProvider {
  readonly name = 'gemini';

  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY is required for Gemini LLM provider');
    this.client = new GoogleGenerativeAI(key);
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  private buildContents(messages: ChatMessage[]) {
    // Gemini uses 'model' for assistant, 'user' for user; system via systemInstruction
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
  }

  async chat(messages: ChatMessage[], opts?: LLMOptions): Promise<string> {
    const system = messages.find((m) => m.role === 'system')?.content;
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      ...(system ? { systemInstruction: system } : {}),
      generationConfig: {
        temperature: opts?.temperature ?? 0.3,
        maxOutputTokens: opts?.maxTokens ?? 2048,
      },
    });
    const result = await genModel.generateContent({ contents: this.buildContents(messages) });
    return result.response.text();
  }

  async *chatStream(messages: ChatMessage[], opts?: LLMOptions): AsyncGenerator<StreamChunk> {
    const system = messages.find((m) => m.role === 'system')?.content;
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      ...(system ? { systemInstruction: system } : {}),
      generationConfig: {
        temperature: opts?.temperature ?? 0.3,
        maxOutputTokens: opts?.maxTokens ?? 2048,
      },
    });
    const result = await genModel.generateContentStream({ contents: this.buildContents(messages) });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { text, done: false };
    }
    yield { text: '', done: true };
  }
}
