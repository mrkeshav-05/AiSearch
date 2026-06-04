/**
 * Central LLM & Embeddings Configuration
 *
 * Provider priority (first available API key wins):
 *   1. Groq          (GROQ_API_KEY)   — PRIMARY: llama-3.3-70b-versatile, FREE & ultra-fast
 *   2. Grok/xAI      (GROK_API_KEY)   — FALLBACK 1a
 *   3. OpenAI        (OPENAI_API_KEY) — FALLBACK 1b
 *   4. Google Gemini (GOOGLE_API_KEY) — FALLBACK 1c
 *   5. SearXNG raw                    — FALLBACK 2 (no LLM, raw search data)
 *
 * Embeddings always use Google text-embedding-004.
 */

import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";

// ─── Active provider detection ────────────────────────────────────────────────

/**
 * Detect which LLM provider to use based on available API keys.
 * Priority: Groq > Grok (xAI) > OpenAI > Google Gemini
 */
export const detectProvider = (): "groq" | "openai" | "grok" | "google" => {
  if (process.env.GROQ_API_KEY)   return "groq";
  if (process.env.GROK_API_KEY)   return "grok";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "google";
};

/**
 * Return the default model name for the active provider.
 */
export const getDefaultModel = (provider: "groq" | "openai" | "grok" | "google"): string => {
  switch (provider) {
    case "groq":   return "llama-3.3-70b-versatile";
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
  groqApiKey: process.env.GROQ_API_KEY,
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
 * Priority order: Groq → Grok (xAI) → OpenAI → Google Gemini
 *
 * @param temperature - Sampling temperature (default 0.7)
 */
export const createLLM = (temperature = 0.7): BaseChatModel => {
  // ── PRIMARY: Groq ──────────────────────────────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    const model = process.env.CHAT_MODEL || "llama-3.3-70b-versatile";
    console.log(`[LLM] ✅ PRIMARY — Using Groq provider — model: ${model}`);
    return new ChatOpenAI({
      modelName: model,
      temperature,
      openAIApiKey: process.env.GROQ_API_KEY,
      configuration: {
        baseURL: "https://api.groq.com/openai/v1",
      },
    }) as BaseChatModel;
  }

  // ── FALLBACK 1a: Grok (xAI) ───────────────────────────────────────────────
  if (process.env.GROK_API_KEY) {
    const model = process.env.CHAT_MODEL || "grok-3-mini";
    console.log(`[LLM] ⚡ FALLBACK 1a — Using Grok (xAI) provider — model: ${model}`);
    return new ChatOpenAI({
      modelName: model,
      temperature,
      openAIApiKey: process.env.GROK_API_KEY,
      configuration: {
        baseURL: "https://api.x.ai/v1",
      },
    }) as BaseChatModel;
  }

  // ── FALLBACK 1b: OpenAI ───────────────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    const model = process.env.CHAT_MODEL || "gpt-4o-mini";
    console.log(`[LLM] ⚡ FALLBACK 1b — Using OpenAI provider — model: ${model}`);
    return new ChatOpenAI({
      modelName: model,
      temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    }) as BaseChatModel;
  }

  // ── FALLBACK 1c: Google Gemini ────────────────────────────────────────────
  const model = process.env.CHAT_MODEL || "gemini-2.0-flash";
  console.log(`[LLM] ⚡ FALLBACK 1c — Using Google Gemini provider — model: ${model}`);
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
const createLLMForProvider = (
  provider: "groq" | "openai" | "grok" | "google",
  temperature = 0.7
): BaseChatModel => {
  if (provider === "groq" && process.env.GROQ_API_KEY) {
    const model = "llama-3.3-70b-versatile";
    console.log(`[LLM Cascade] Trying Groq (PRIMARY) — model: ${model}`);
    return new ChatOpenAI({
      modelName: model, temperature,
      openAIApiKey: process.env.GROQ_API_KEY,
      configuration: { baseURL: "https://api.groq.com/openai/v1" },
    }) as BaseChatModel;
  }
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
 *
 * Cascade order: Groq → Grok (xAI) → OpenAI → Gemini → null (SearXNG raw)
 */
export const createNextLLM = (currentProvider: string, temperature = 0.7): BaseChatModel | null => {
  const chain: Array<"groq" | "grok" | "openai" | "google"> = ["groq", "grok", "openai", "google"];
  const idx = chain.indexOf(currentProvider as "groq" | "grok" | "openai" | "google");
  for (let i = idx + 1; i < chain.length; i++) {
    const next = chain[i];
    if (next === "groq"   && process.env.GROQ_API_KEY)   return createLLMForProvider("groq",   temperature);
    if (next === "grok"   && process.env.GROK_API_KEY)   return createLLMForProvider("grok",   temperature);
    if (next === "openai" && process.env.OPENAI_API_KEY) return createLLMForProvider("openai", temperature);
    if (next === "google" && process.env.GOOGLE_API_KEY) return createLLMForProvider("google", temperature);
  }
  console.log("[LLM Cascade] All LLM providers exhausted — FALLBACK 2: SearXNG raw data only");
  return null;
};

// ─── Embeddings factory ───────────────────────────────────────────────────────

/**
 * Always uses Google text-embedding-004 (Groq/Grok/OpenAI don't offer free embeddings).
 * GOOGLE_API_KEY is required even when using Groq as the chat provider.
 */
/**
 * A sentinel value stored as the first element of a dummy embedding.
 * When the reranking code sees embeddings of length DUMMY_DIM_SENTINEL,
 * it knows embedding failed and should bypass similarity scoring.
 */
export const EMBEDDING_DUMMY_SENTINEL = 1; // length of dummy vectors

class SafeEmbeddings extends Embeddings {
  private primary: Embeddings | null = null;
  private fallback?: Embeddings;

  /** True when both primary and fallback are unavailable */
  private allFailed = false;

  constructor() {
    super({});
    if (process.env.GOOGLE_API_KEY) {
      this.primary = new GoogleGenerativeAIEmbeddings({
        modelName: "text-embedding-004",
      });
    }
    if (process.env.OPENAI_API_KEY) {
      this.fallback = new OpenAIEmbeddings({
        modelName: "text-embedding-3-small",
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /** Returns a dummy embedding vector of sentinel length [0.0] */
  private static dummyVec(): number[] {
    return [0.0]; // length=1 sentinel — will be detected by reranker
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (this.primary) {
      try {
        const result = await this.primary.embedDocuments(texts);
        // Sanity check: all vectors must have the same non-zero length
        if (result.every((v) => v.length > 0)) {
          this.allFailed = false;
          return result;
        }
      } catch (error: any) {
        console.warn(`[Embeddings] Primary failed: ${error.message}. Attempting fallback.`);
      }
    }
    if (this.fallback) {
      try {
        const result = await this.fallback.embedDocuments(texts);
        if (result.every((v) => v.length > 0)) {
          this.allFailed = false;
          return result;
        }
      } catch (fbError: any) {
        console.error(`[Embeddings] Fallback also failed: ${fbError.message}`);
      }
    }
    this.allFailed = true;
    console.warn("[Embeddings] All providers failed — returning sentinel dummy embeddings (reranker will bypass similarity).");
    return texts.map(() => SafeEmbeddings.dummyVec());
  }

  async embedQuery(text: string): Promise<number[]> {
    if (this.primary) {
      try {
        const result = await this.primary.embedQuery(text);
        if (result.length > 0) {
          this.allFailed = false;
          return result;
        }
      } catch (error: any) {
        console.warn(`[Embeddings] Primary failed: ${error.message}. Attempting fallback.`);
      }
    }
    if (this.fallback) {
      try {
        const result = await this.fallback.embedQuery(text);
        if (result.length > 0) {
          this.allFailed = false;
          return result;
        }
      } catch (fbError: any) {
        console.error(`[Embeddings] Fallback also failed: ${fbError.message}`);
      }
    }
    this.allFailed = true;
    console.warn("[Embeddings] All providers failed — returning sentinel dummy query embedding (reranker will bypass similarity).");
    return SafeEmbeddings.dummyVec();
  }
}

export const getEmbeddingsInstance = (): Embeddings => {
  return new SafeEmbeddings();
};

// ─── Provider summary (logged at startup) ────────────────────────────────────

export const logProviderInfo = (): void => {
  const provider = detectProvider();
  const model    = getDefaultModel(provider);
  const keys = {
    GROQ_API_KEY   : !!process.env.GROQ_API_KEY,
    GROK_API_KEY   : !!process.env.GROK_API_KEY,
    OPENAI_API_KEY : !!process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY : !!process.env.GOOGLE_API_KEY,
  };
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`[Config] Active LLM provider : ${provider.toUpperCase()} (PRIMARY)`);
  console.log(`[Config] Active model        : ${model}`);
  console.log(`[Config] API keys found      :`, keys);
  console.log(`[Config] Fallback chain      : Groq → Grok → OpenAI → Gemini → SearXNG RAW`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

// ─── Active provider info for status messages ─────────────────────────────────

/**
 * Returns a human-readable provider name and model for use in status messages.
 */
export const getActiveProviderInfo = (): { providerName: string; model: string; providerKey: string } => {
  if (process.env.GROQ_API_KEY) {
    const model = process.env.CHAT_MODEL || "llama-3.3-70b-versatile";
    return { providerName: "Groq (llama-3.3-70b-versatile)", model, providerKey: "GROQ_API_KEY" };
  }
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