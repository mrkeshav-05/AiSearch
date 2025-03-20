import { WebSocket } from "ws"
import { handleMessage } from "./messageHandler"

export const handleConnection = (ws: WebSocket) => {
  ws.on(
    "message",
    async (message: string) => await handleMessage(message.toString(), ws)
  )
  ws.on("close", () => console.log("Connection CLosed!"));
}