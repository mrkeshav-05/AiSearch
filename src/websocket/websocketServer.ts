import http from 'http'
import { WebSocketServer } from 'ws'
import { handleConnection } from './connectionManager'
import { randomUUID } from 'crypto';

export const initServer = (
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
) => {
  const wss = new WebSocketServer({ server })
  wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url?.split('?')[1]);
    const clientId = params.get("id") || randomUUID();
  
    (ws as any).id = clientId;
    console.log(`Client connected: ${clientId}`);
  
    handleConnection(ws);
  });

  console.log(`Websocket server started on port ${process.env.BACKEND_PORT}`);
}