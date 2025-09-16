// Available LLM providers and models
// Manages the registry of available chat models

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export interface ProvidersConfig {
  [provider: string]: {
    [model: string]: BaseChatModel;
  };
}

/**
 * Get all available chat model providers and their models
 */
export const getAvailableProviders = async (): Promise<ProvidersConfig> => {
  const providers: ProvidersConfig = {
    google: {
      "gemini-2.0-flash": new ChatGoogleGenerativeAI({
        modelName: "gemini-2.0-flash",
        temperature: 0.7,
      }) as BaseChatModel,
      "gemini-1.5-pro": new ChatGoogleGenerativeAI({
        modelName: "gemini-1.5-pro",
        temperature: 0.7,
      }) as BaseChatModel,
    },
  };

  return providers;
};