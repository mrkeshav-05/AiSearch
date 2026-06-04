/**
 * Central LLM & Embeddings Configuration
 *
 * Provider priority (first available API key wins):
 *   1. Grok/xAI (GROK_API_KEY)   — fast, generous free tier
 *   2. OpenAI  (OPENAI_API_KEY)
 *   3. Google Gemini (GOOGLE_API_KEY) — default fallback
 *
 * Embeddings always use Google text-embedding-004.
 */

import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";

// ─── Active provider detection ────────────────────────────────────────────────

/**
 * Detect which LLM provider to use based on available API keys.
 * Priority: Grok > OpenAI > Google Gemini
 */
export const detectProvider = (): "openai" | "grok" | "google" => {
  if (process.env.GROK_API_KEY)   return "grok";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "google";
};

/**
 * Return the default model name for the active provider.
 */
export const getDefaultModel = (provider: "openai" | "grok" | "google"): string => {
  switch (provider) {
    case "grok":   return "grok-3-mini";
    case "openai": return "gpt-4o-mini";
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
 * Priority order: Grok (xAI) → OpenAI → Google Gemini
 *
 * @param temperature - Sampling temperature (default 0.7)
 */
export const createLLM = (temperature = 0.7): BaseChatModel => {
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

  if (process.env.OPENAI_API_KEY) {
    const model = process.env.CHAT_MODEL || "gpt-4o-mini";
    console.log(`[LLM] Using OpenAI provider — model: ${model}`);
    return new ChatOpenAI({
      modelName: model,
      temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
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
 */
export const getChatModelInstance = (): BaseChatModel => createLLM();

/**
 * Create an LLM for a specific provider (used for cascade fallback).
 */
const createLLMForProvider = (provider: "openai" | "grok" | "google", temperature = 0.7): BaseChatModel => {
  if (provider === "grok" && process.env.GROK_API_KEY) {
    const model = "grok-3-mini";
    console.log(`[LLM Cascade] Trying Grok (xAI) — model: ${model}`);
    return new ChatOpenAI({
      modelName: model, temperature,
      openAIApiKey: process.env.GROK_API_KEY,
      configuration: { baseURL: "https://api.x.ai/v1" },
    }) as BaseChatModel;
  }
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const model = "gpt-4o-mini";
    console.log(`[LLM Cascade] Trying OpenAI — model: ${model}`);
    return new ChatOpenAI({
      modelName: model, temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    }) as BaseChatModel;
  }
  // google
  const model = "gemini-2.0-flash";
  console.log(`[LLM Cascade] Trying Google Gemini — model: ${model}`);
  return new ChatGoogleGenerativeAI({ modelName: model, temperature }) as BaseChatModel;
};

/**
 * Returns an LLM for the next provider after the given one, or null if all exhausted.
 * Used for cascading when a provider is rate-limited or has no credits.
 * Cascade order: Grok → OpenAI → Gemini
 */
export const createNextLLM = (currentProvider: string, temperature = 0.7): BaseChatModel | null => {
  const chain: Array<"grok" | "openai" | "google"> = ["grok", "openai", "google"];
  const idx = chain.indexOf(currentProvider as "grok" | "openai" | "google");
  for (let i = idx + 1; i < chain.length; i++) {
    const next = chain[i];
    if (next === "grok"   && process.env.GROK_API_KEY)   return createLLMForProvider("grok",   temperature);
    if (next === "openai" && process.env.OPENAI_API_KEY) return createLLMForProvider("openai", temperature);
    if (next === "google" && process.env.GOOGLE_API_KEY) return createLLMForProvider("google", temperature);
  }
  console.log("[LLM Cascade] All providers exhausted — falling back to SearXNG only");
  return null;
};

// ─── Embeddings factory ───────────────────────────────────────────────────────

/**
 * Always uses Google text-embedding-004 (Grok/OpenAI don't offer free embeddings).
 * GOOGLE_API_KEY is required even when using Grok/OpenAI as the chat provider.
 */
export const getEmbeddingsInstance = (): Embeddings => {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error(
      "[Config] GOOGLE_API_KEY is required for embeddings (document reranking). " +
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
    GROK_API_KEY   : !!process.env.GROK_API_KEY,
    OPENAI_API_KEY : !!process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY : !!process.env.GOOGLE_API_KEY,
  };
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`[Config] Active LLM provider : ${provider.toUpperCase()}`);
  console.log(`[Config] Active model        : ${model}`);
  console.log(`[Config] API keys found      :`, keys);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

// ─── Active provider info for status messages ─────────────────────────────────

/**
 * Returns a human-readable provider name and model for use in status messages.
 */
export const getActiveProviderInfo = (): { providerName: string; model: string; providerKey: string } => {
  if (process.env.GROK_API_KEY) {
    const model = process.env.CHAT_MODEL || "grok-3-mini";
    return { providerName: "Grok (xAI)", model, providerKey: "GROK_API_KEY" };
  }
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.CHAT_MODEL || "gpt-4o-mini";
    return { providerName: "OpenAI", model, providerKey: "OPENAI_API_KEY" };
  }
  const model = process.env.CHAT_MODEL || "gemini-2.0-flash";
  return { providerName: "Gemini", model, providerKey: "GOOGLE_API_KEY" };
};