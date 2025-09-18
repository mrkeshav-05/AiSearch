// Configuration for chat models and providers
// Manages LLM model selection and initialization

import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";

// Default configuration
const DEFAULT_CHAT_MODEL = "gemini-2.0-flash";
const DEFAULT_CHAT_MODEL_PROVIDER = "google";

/**
 * Application Configuration
 */
export const config = {
  port: parseInt(process.env.PORT || '8000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  googleApiKey: process.env.GOOGLE_API_KEY,
  searxngUrl: process.env.SEARXNG_API_URL || 'http://localhost:8080'
};

/**
 * Get the configured chat model name
 */
export const getChatModel = (): string => {
  return process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL;
};

/**
 * Get the configured chat model provider
 */
export const getChatModelProvider = (): string => {
  return process.env.CHAT_MODEL_PROVIDER || DEFAULT_CHAT_MODEL_PROVIDER;
};

/**
 * Get a configured chat model instance
 */
export const getChatModelInstance = (): BaseChatModel => {
  const provider = getChatModelProvider();
  const model = getChatModel();
  
  switch (provider) {
    case "google":
      return new ChatGoogleGenerativeAI({
        modelName: model,
        temperature: 0.7,
      }) as BaseChatModel;
    default:
      throw new Error(`Unsupported chat model provider: ${provider}`);
  }
};

/**
 * Get embeddings instance
 */
export const getEmbeddingsInstance = (): Embeddings => {
  return new GoogleGenerativeAIEmbeddings({
    modelName: "text-embedding-004",
  }) as Embeddings;
};