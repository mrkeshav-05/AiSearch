// WebSocket server implementation for real-time AI search communication
// Handles client connections, message routing, and connection management
import http from 'http'
import { WebSocketServer } from 'ws'
import { handleConnection } from './connectionManager'
import { randomUUID } from 'crypto';

/**
 * Initializes the WebSocket server and sets up connection handling
 * 
 * @param server - HTTP server instance to attach WebSocket server to
 * 
 * Functionality:
 * - Creates WebSocket server attached to HTTP server
 * - Handles client connections with unique ID assignment
 * - Routes connections to connection manager for message handling
 * 
 * Connection Flow:
 * 1. Client connects to ws://localhost:5000
 * 2. Extract client ID from URL params or generate new UUID
 * 3. Assign unique ID to WebSocket connection
 * 4. Pass connection to connection manager for message handling
 * 
 * URL Format: ws://localhost:5000?id=optional-client-id
 */
export const initServer = (
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
) => {
  // Create WebSocket server attached to HTTP server
  // This allows both HTTP and WebSocket on the same port
  const wss = new WebSocketServer({ server })
  
  // Handle new client connections
  wss.on("connection", (ws, req) => {
    // Extract client ID from URL parameters or generate new one
    // Allows clients to reconnect with same ID for session continuity
    const params = new URLSearchParams(req.url?.split('?')[1]);
    const clientId = params.get("id") || randomUUID();
  
    // Assign unique ID to WebSocket connection for tracking
    (ws as any).id = clientId;
    console.log(`Client connected: ${clientId}`);
  
    // Pass connection to connection manager for message handling
    // Connection manager handles message routing and processing
    handleConnection(ws);
  });

  console.log(`Websocket server started on port ${process.env.BACKEND_PORT}`);
}