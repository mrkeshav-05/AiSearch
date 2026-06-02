import type { EmbeddingProvider } from './embedding.interface';
import type { LLMProvider } from './llm.interface';

import { GeminiEmbeddingProvider, GeminiLLMProvider } from './gemini.provider';
import { OpenAIEmbeddingProvider, OpenAILLMProvider } from './openai.provider';
import { OllamaEmbeddingProvider, OllamaLLMProvider } from './ollama.provider';
import { AnthropicLLMProvider } from './anthropic.provider';

/**
 * Returns an EmbeddingProvider based on the EMBEDDING_PROVIDER env var.
 * Supported values: 'gemini' (default) | 'openai' | 'ollama'
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
 * Supported values: 'gemini' (default) | 'openai' | 'ollama' | 'anthropic'
 */
export function createLLMProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();
  switch (provider) {
    case 'openai':
      return new OpenAILLMProvider();
    case 'ollama':
      return new OllamaLLMProvider();
    case 'anthropic':
      return new AnthropicLLMProvider();
    case 'gemini':
    default:
      return new GeminiLLMProvider();
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
