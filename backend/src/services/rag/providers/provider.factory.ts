import type { EmbeddingProvider } from './embedding.interface';
import type { LLMProvider } from './llm.interface';

import { GeminiEmbeddingProvider, GeminiLLMProvider } from './gemini.provider';
import { OpenAIEmbeddingProvider, OpenAILLMProvider } from './openai.provider';
import { OllamaEmbeddingProvider, OllamaLLMProvider } from './ollama.provider';
import { AnthropicLLMProvider } from './anthropic.provider';
import { GroqLLMProvider } from './groq.provider';

/**
 * Returns an EmbeddingProvider based on the EMBEDDING_PROVIDER env var.
 * Supported values: 'gemini' (default) | 'openai' | 'ollama'
 * NOTE: Groq does NOT support an embeddings API and is intentionally excluded.
 */
export function createEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();

  switch (provider) {
    case 'openai':
      return new OpenAIEmbeddingProvider();
    case 'ollama':
      return new OllamaEmbeddingProvider();
    case 'gemini':
    default:
      return new GeminiEmbeddingProvider();
  }
}

/**
 * Returns an LLMProvider based on the LLM_PROVIDER env var.
 * Supported values: 'groq' (default) | 'gemini' | 'openai' | 'ollama' | 'anthropic'
 *
 * Groq is the default because:
 *  - It uses the same GROQ_API_KEY already used for the main chat pipeline.
 *  - It's fast (hardware-accelerated inference) and free-tier friendly.
 *  - Its API is OpenAI-compatible so streaming works out of the box.
 */
export function createLLMProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER || 'groq').toLowerCase();

  switch (provider) {
    case 'openai':
      return new OpenAILLMProvider();
    case 'ollama':
      return new OllamaLLMProvider();
    case 'anthropic':
      return new AnthropicLLMProvider();
    case 'gemini':
      return new GeminiLLMProvider();
    case 'groq':
    default:
      return new GroqLLMProvider();
  }
}

// Singletons — lazily initialised so tests can set env vars first.
let _embeddingProvider: EmbeddingProvider | null = null;
let _llmProvider: LLMProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!_embeddingProvider) _embeddingProvider = createEmbeddingProvider();
  return _embeddingProvider;
}

export function getLLMProvider(): LLMProvider {
  if (!_llmProvider) _llmProvider = createLLMProvider();
  return _llmProvider;
}

/** Call during tests or when env vars change at runtime. */
export function resetProviders(): void {
  _embeddingProvider = null;
  _llmProvider = null;
}
