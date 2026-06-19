import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAIEmbeddingProvider } from './openai.provider';
import type { EmbeddingProvider } from './embedding.interface';
import type { LLMProvider, ChatMessage, LLMOptions, StreamChunk } from './llm.interface';

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
      const isRateLimit = 
        error?.status === 429 || 
        error?.statusCode === 429 || 
        error?.response?.status === 429 ||
        String(error).includes('429') ||
        String(error?.message).includes('429') ||
        String(error?.message).toLowerCase().includes('quota') ||
        String(error?.message).toLowerCase().includes('rate limit') ||
        String(error?.message).toLowerCase().includes('too many requests');

      if (attempt > retries || !isRateLimit) {
        throw error;
      }
      
      const delay = Math.min(initialDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);
      console.warn(`[GeminiEmbeddingProvider] Rate limited (429). Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${retries})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

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
    // text-embedding-004 is deprecated as of early 2026. Use gemini-embedding-001 instead.
    this.model = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  }

  async embed(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: this.model });
    const result = await retryWithBackoff(() =>
      model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        // MRL truncation: request exactly 768 dims so output matches pgvector column
        outputDimensionality: this.dimension,
      } as any)
    );
    return result.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const model = this.client.getGenerativeModel({ model: this.model });
    
    try {
      // Primary attempt: Native Batch API with MRL dimensionality truncation to 768
      const result = await retryWithBackoff(() => model.batchEmbedContents({
        requests: texts.map((t) => ({
          content: { role: 'user', parts: [{ text: t }] },
          // MRL truncation: request exactly the dimension the DB column is sized for
          outputDimensionality: this.dimension,
        } as any)),
      }));
      return result.embeddings.map((e) => e.values);
    } catch (error: any) {
      console.warn(`[GeminiEmbeddingProvider] batchEmbedContents failed (${error.message}). Attempting sequential fallback...`);
      
      try {
        // Fallback 1: Sequential Embedding via embedContent (slower but bypasses v1beta batch issues)
        const embeddings: number[][] = [];
        for (const text of texts) {
          // Add a small delay between sequential requests to reduce rate limiting probability
          await new Promise((resolve) => setTimeout(resolve, 300));
          const result = await retryWithBackoff(() =>
            model.embedContent({
              content: { role: 'user', parts: [{ text }] },
              outputDimensionality: this.dimension,
            } as any)
          );
          embeddings.push(result.embedding.values);
        }
        return embeddings;
      } catch (seqError: any) {
        console.warn(`[GeminiEmbeddingProvider] Sequential fallback also failed (${seqError.message}).`);
        throw new Error(`Gemini embedding failed. Check your GOOGLE_API_KEY is valid and gemini-embedding-001 is accessible. Last error: ${seqError.message}`);
      }
    }
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
