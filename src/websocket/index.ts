import http from 'http';
import { initServer } from './websocketServer';
export const startWebSocketServer = (
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
) => {
  console.log("Starting WebSocket server...");
  initServer(server);
}