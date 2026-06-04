// Available LLM providers and models
// Dynamically builds registry based on available API keys
//
// Provider priority:
//   1. Groq          (GROQ_API_KEY)   — PRIMARY: llama-3.3-70b-versatile, free & ultra-fast
//   2. Grok/xAI      (GROK_API_KEY)   — FALLBACK 1a
//   3. OpenAI        (OPENAI_API_KEY) — FALLBACK 1b
//   4. Google Gemini (GOOGLE_API_KEY) — FALLBACK 1c

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface ProvidersConfig {
  [provider: string]: {
    [model: string]: BaseChatModel;
  };
}

/**
 * Get all available chat model providers and their models.
 * Only includes providers for which an API key is present.
 * Groq is always registered first when available to enforce cost-saving priority.
 */
export const getAvailableProviders = async (): Promise<ProvidersConfig> => {
  const providers: ProvidersConfig = {};

  // ── Groq (PRIMARY — OpenAI-compatible API) ────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    providers.groq = {
      "llama-3.3-70b-versatile": new ChatOpenAI({
        modelName: "llama-3.3-70b-versatile",
        temperature: 0.7,
        openAIApiKey: process.env.GROQ_API_KEY,
        configuration: { baseURL: "https://api.groq.com/openai/v1" },
      }) as BaseChatModel,
      "llama-3.1-8b-instant": new ChatOpenAI({
        modelName: "llama-3.1-8b-instant",
        temperature: 0.7,
        openAIApiKey: process.env.GROQ_API_KEY,
        configuration: { baseURL: "https://api.groq.com/openai/v1" },
      }) as BaseChatModel,
      "mixtral-8x7b-32768": new ChatOpenAI({
        modelName: "mixtral-8x7b-32768",
        temperature: 0.7,
        openAIApiKey: process.env.GROQ_API_KEY,
        configuration: { baseURL: "https://api.groq.com/openai/v1" },
      }) as BaseChatModel,
    };
  }

  // ── Grok (xAI) — FALLBACK 1a ──────────────────────────────────────────────
  if (process.env.GROK_API_KEY) {
    providers.grok = {
      "grok-3-mini": new ChatOpenAI({
        modelName: "grok-3-mini",
        temperature: 0.7,
        openAIApiKey: process.env.GROK_API_KEY,
        configuration: { baseURL: "https://api.x.ai/v1" },
      }) as BaseChatModel,
      "grok-3": new ChatOpenAI({
        modelName: "grok-3",
        temperature: 0.7,
        openAIApiKey: process.env.GROK_API_KEY,
        configuration: { baseURL: "https://api.x.ai/v1" },
      }) as BaseChatModel,
    };
  }

  // ── OpenAI — FALLBACK 1b ──────────────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    providers.openai = {
      "gpt-4o-mini": new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY,
      }) as BaseChatModel,
      "gpt-4o": new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY,
      }) as BaseChatModel,
      "gpt-3.5-turbo": new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0.7,
        openAIApiKey: process.env.OPENAI_API_KEY,
      }) as BaseChatModel,
    };
  }

  // ── Google Gemini — FALLBACK 1c ───────────────────────────────────────────
  if (process.env.GOOGLE_API_KEY) {
    providers.google = {
      "gemini-2.0-flash": new ChatGoogleGenerativeAI({
        modelName: "gemini-2.0-flash",
        temperature: 0.7,
      }) as BaseChatModel,
      "gemini-1.5-pro": new ChatGoogleGenerativeAI({
        modelName: "gemini-1.5-pro",
        temperature: 0.7,
      }) as BaseChatModel,
    };
  }

  return providers;
};