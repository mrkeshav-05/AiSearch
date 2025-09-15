/**
 * WebSocket Connection Manager with Google Gemini Integration
 * 
 * Initializes Google Gemini models for YouTube search functionality
 * and manages WebSocket connections for real-time AI responses.
 */

import { WebSocket } from "ws";
import { handleMessage } from "./messageHandler";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";

/**
 * Initialize Google Gemini LLM for YouTube Search
 * 
 * Uses the latest Gemini 2.0 Flash model optimized for
 * video content analysis and educational response generation.
 */
const initializeGeminiLLM = (): BaseChatModel => {
  console.log("🤖 Initializing Google Gemini LLM for YouTube Search...");
  
  return new ChatGoogleGenerativeAI({
    modelName: "gemini-2.0-flash-exp", // Latest experimental Gemini model
    temperature: 0.7, // Balanced creativity for educational content
    apiKey: process.env.GOOGLE_API_KEY, // Use Gemini API key from environment
  }) as BaseChatModel;
};

/**
 * Initialize Google Embeddings for Semantic Analysis
 * 
 * Uses Google's advanced embedding model for YouTube content
 * ranking and similarity computation.
 */
const initializeGeminiEmbeddings = (): Embeddings => {
  console.log("🔍 Initializing Google Embeddings for YouTube Search...");
  
  return new GoogleGenerativeAIEmbeddings({
    modelName: "text-embedding-004", // Latest embedding model
    apiKey: process.env.GOOGLE_API_KEY, // Use Gemini API key from environment
  }) as Embeddings;
};

/**
 * Enhanced Connection Handler with Gemini Integration
 * 
 * Sets up each WebSocket connection with Google Gemini models
 * specifically optimized for YouTube search functionality.
 */
export const handleConnection = (ws: WebSocket) => {
  const connectionId = (ws as any).id || 'unknown';
  console.log(`🔗 Setting up Gemini AI for connection: ${connectionId}`);

  try {
    // Initialize Google Gemini models
    const llm = initializeGeminiLLM();
    const embeddings = initializeGeminiEmbeddings();

    console.log(`✅ Gemini models initialized for connection: ${connectionId}`);

    // Handle incoming messages with existing message handler
    ws.on("message", async (message: string) => {
      try {
        console.log(`📨 Processing message: ${connectionId}`);
        await handleMessage(message.toString(), ws);
      } catch (error) {
        console.error(`❌ Message processing error: ${connectionId}:`, error);
        ws.send(JSON.stringify({
          type: "error",
          data: "Failed to process your message. Please try again."
        }));
      }
    });

    // Handle connection close
    ws.on("close", () => {
      console.log(`🔌 Connection closed: ${connectionId}`);
    });

    // Handle connection errors
    ws.on("error", (error) => {
      console.error(`💥 WebSocket error for connection ${connectionId}:`, error);
    });

  } catch (error) {
    console.error(`🚨 Failed to initialize Gemini AI for connection ${connectionId}:`, error);
    ws.send(JSON.stringify({
      type: "error",
      data: "Failed to initialize Gemini AI system. Please check your GOOGLE_API_KEY and try again."
    }));
    ws.close();
  }
};