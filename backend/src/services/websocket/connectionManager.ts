/**
 * WebSocket Connection Manager
 *
 * Manages WebSocket connections for real-time AI responses.
 * The LLM provider is selected automatically by the central config:
 *   OpenAI → Grok (xAI) → Google Gemini
 */

import { WebSocket } from "ws";
import { handleMessage } from "./messageHandler";
import { logProviderInfo } from "../../config";

// Log which provider is active once at module load time
logProviderInfo();

/**
 * Handle a new incoming WebSocket connection.
 * Sets up message, close, and error listeners.
 */
export const handleConnection = (ws: WebSocket) => {
  const connectionId = (ws as any).id || "unknown";
  console.log(`🔗 New connection: ${connectionId}`);

  // Handle incoming messages
  ws.on("message", async (message: string) => {
    try {
      console.log(`📨 Processing message: ${connectionId}`);
      await handleMessage(message.toString(), ws);
    } catch (error) {
      console.error(`❌ Message processing error [${connectionId}]:`, error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Failed to process your message. Please try again.",
        })
      );
    }
  });

  // Handle connection close
  ws.on("close", () => {
    console.log(`🔌 Connection closed: ${connectionId}`);
  });

  // Handle connection errors
  ws.on("error", (error) => {
    console.error(`💥 WebSocket error [${connectionId}]:`, error);
  });
};