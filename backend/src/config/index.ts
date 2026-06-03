/**
 * Central LLM & Embeddings Configuration
 *
 * Provider priority (first available API key wins):
 *   1. OpenAI  (OPENAI_API_KEY)
 *   2. Grok/xAI (GROK_API_KEY)   — OpenAI-compatible endpoint
 *   3. Google Gemini (GOOGLE_API_KEY) — default fallback
 *
 * Embeddings always use Google (no embeddings API from OpenAI/Grok in free tier).
 */

import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";

// ─── Active provider detection ────────────────────────────────────────────────

/**
 * Detect which LLM provider to use based on available API keys.
 * Priority: OpenAI > Grok > Google Gemini
 */
export const detectProvider = (): "openai" | "grok" | "google" => {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GROK_API_KEY)   return "grok";
  return "google";
};

/**
 * Return the default model name for the active provider.
 */
export const getDefaultModel = (provider: "openai" | "grok" | "google"): string => {
  switch (provider) {
    case "openai": return "gpt-4o-mini";
    case "grok":   return "grok-3-mini";
    case "google": return "gemini-2.0-flash";
  }
};

// ─── Application configuration ────────────────────────────────────────────────

export const config = {
  port: parseInt(process.env.BACKEND_PORT || "8000"),
  nodeEnv: process.env.NODE_ENV || "development",
  googleApiKey: process.env.GOOGLE_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  grokApiKey: process.env.GROK_API_KEY,
  searxngUrl: process.env.SEARXNG_API_URL || "http://localhost:8080",
};

// ─── Model name helpers (respects env overrides) ──────────────────────────────

export const getChatModelProvider = (): string =>
  process.env.CHAT_MODEL_PROVIDER || detectProvider();

export const getChatModel = (): string =>
  process.env.CHAT_MODEL || getDefaultModel(detectProvider());

// ─── LLM factory ─────────────────────────────────────────────────────────────

/**
 * Create and return the appropriate BaseChatModel based on available API keys.
 *
 * Priority order: OpenAI → Grok (xAI) → Google Gemini
 *
 * @param temperature - Sampling temperature (default 0.7)
 */
export const createLLM = (temperature = 0.7): BaseChatModel => {
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.CHAT_MODEL || "gpt-4o-mini";
    console.log(`[LLM] Using OpenAI provider — model: ${model}`);
    return new ChatOpenAI({
      modelName: model,
      temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    }) as BaseChatModel;
  }

  if (process.env.GROK_API_KEY) {
    const model = process.env.CHAT_MODEL || "grok-3-mini";
    console.log(`[LLM] Using Grok (xAI) provider — model: ${model}`);
    return new ChatOpenAI({
      modelName: model,
      temperature,
      openAIApiKey: process.env.GROK_API_KEY,
      configuration: {
        baseURL: "https://api.x.ai/v1",
      },
    }) as BaseChatModel;
  }

  // Default: Google Gemini
  const model = process.env.CHAT_MODEL || "gemini-2.0-flash";
  console.log(`[LLM] Using Google Gemini provider — model: ${model}`);
  return new ChatGoogleGenerativeAI({
    modelName: model,
    temperature,
  }) as BaseChatModel;
};

/**
 * @deprecated Use createLLM() directly instead.
 * Kept for backward-compatibility with any code that calls getChatModelInstance().
 */
export const getChatModelInstance = (): BaseChatModel => createLLM();

// ─── Embeddings factory ───────────────────────────────────────────────────────

/**
 * Get an embeddings instance.
 * Always uses Google text-embedding-004 because neither OpenAI's paid
 * embeddings API nor Grok's API is available in this setup.
 * If GOOGLE_API_KEY is missing a clear error is thrown at startup.
 */
export const getEmbeddingsInstance = (): Embeddings => {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error(
      "[Config] GOOGLE_API_KEY is required for embeddings (used by document reranking). " +
      "Please add it to your .env file."
    );
  }
  return new GoogleGenerativeAIEmbeddings({
    modelName: "text-embedding-004",
  }) as Embeddings;
};

// ─── Provider summary (logged at startup) ────────────────────────────────────

export const logProviderInfo = (): void => {
  const provider = detectProvider();
  const model    = getDefaultModel(provider);
  const keys = {
    OPENAI_API_KEY : !!process.env.OPENAI_API_KEY,
    GROK_API_KEY   : !!process.env.GROK_API_KEY,
    GOOGLE_API_KEY : !!process.env.GOOGLE_API_KEY,
  };
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`[Config] Active LLM provider : ${provider.toUpperCase()}`);
  console.log(`[Config] Active model        : ${model}`);
  console.log(`[Config] API keys found      :`, keys);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};