// WebSocket server initialization module
// This file serves as the entry point for WebSocket functionality
import http from 'http';
import { initServer } from './websocketServer';

/**
 * Starts the WebSocket server attached to the HTTP server
 * 
 * @param server - HTTP server instance to attach WebSocket to
 * 
 * Purpose:
 * - Enables real-time bidirectional communication between frontend and backend
 * - Allows streaming of AI responses for better user experience
 * - Handles message routing for different focus modes (webSearch, imageSearch, etc.)
 * 
 * Usage:
 * Called from main server.ts after HTTP server is created
 */
export const startWebSocketServer = (
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
) => {
  console.log("Starting WebSocket server...");
  // Initialize the WebSocket server with connection management
  initServer(server);
}