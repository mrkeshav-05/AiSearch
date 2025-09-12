import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { WebSocket } from "ws";
import handleWebSearch from "../agents/webSearchAgent";

type Message = {
  type: string;
  message: string;
  copilot?: string;
  focusMode: string;
  history: Array<[string, string]>;
}

export const handleMessage = async (message: string, ws: WebSocket) => {
  try{
    console.log("[BACKEND] Received message:", message);
    const paresedMessage = JSON.parse(message) as Message
    console.log("[BACKEND] Parsed message:", paresedMessage);
    const id = Math.random().toString(36).substring(7)
    
    if(!paresedMessage.message){
      return ws.send(
        JSON.stringify({type: "error", data: "Invalid message format."})
      )
    }
    
    // Convert history to BaseMessage[] format for LangChain
    const history: BaseMessage[] = paresedMessage.history.map((msg) => {
      if(msg[0] === "human"){
        return new HumanMessage({
          content: msg[1]
        })
      }else{
        return new AIMessage({
          content: msg[1]
        })
      }
    })
    
    // Convert history to string format for chat_history parameter
    const chat_history = paresedMessage.history
      .map(([role, content]) => `${role}: ${content}`)
      .join('\n');
    
    console.log("[BACKEND] Formatted chat_history:", chat_history);
    
    if(paresedMessage.type === "message"){
      const focusMode = paresedMessage.focusMode || "webSearch"
      switch(focusMode){
        case "webSearch":{
          // Pass both the message, history, and formatted chat_history
          const emitter = handleWebSearch(paresedMessage.message, history, chat_history);
          
          emitter.on("data", (data) => {
            const paresedData = JSON.parse(data);
            if(paresedData.type === "response"){
              ws.send(
                JSON.stringify({
                  type: "message", // Changed from "response" to "message" to match frontend
                  data: paresedData.data,
                  messageId: id
                })
              )
            }else if(paresedData.type === "sources"){
              ws.send(
                JSON.stringify({
                  type: "sources",
                  data: paresedData.data,
                  messageId: id
                })
              )
            }
          })

          emitter.on("end", () => {
            ws.send(JSON.stringify({type: "messageEnd", messageId: id}))
          })
          
          emitter.on("error", (data) => {
            const paresedData = JSON.parse(data);
            ws.send(JSON.stringify({type: "error", data: paresedData.data}))
          })
          break; // Add break statement
        }
      }
    }
  } catch(e){
    console.log("Failed to handle message", e);
    ws.send(JSON.stringify({type: "error", data: "Invalid message format"}))
  }
}