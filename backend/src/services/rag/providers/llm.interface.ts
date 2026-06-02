/**
 * Provider-agnostic LLM interface.
 * Any text-generation backend (Gemini, OpenAI, Claude, Ollama, …) implements this.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface StreamChunk {
  text: string;
  done: boolean;
}

export interface LLMProvider {
  readonly name: string;
  /** Non-streaming completion. */
  chat(messages: ChatMessage[], opts?: LLMOptions): Promise<string>;
  /** Token-by-token streaming via async generator. */
  chatStream(messages: ChatMessage[], opts?: LLMOptions): AsyncGenerator<StreamChunk>;
}
