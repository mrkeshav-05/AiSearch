/**
 * Provider-agnostic Embedding interface.
 * Any embedding backend (Gemini, OpenAI, Ollama, …) implements this.
 */
export interface EmbeddingProvider {
  readonly name: string;
  /** Expected vector length for every embedding produced. */
  readonly dimension: number;
  /** Embed a single string. */
  embed(text: string): Promise<number[]>;
  /** Embed multiple strings in one call (with provider-side batching). */
  embedBatch(texts: string[]): Promise<number[][]>;
}
