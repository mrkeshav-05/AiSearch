import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { WebSocket } from "ws";
import handleWebSearch from "../agents/webSearchAgent";

type Message = {
  type: string;
  content: string;
  copilot: string;
  focus: string;
  history: Array<[string, string]>;
}


export const handleMessage = async (message: string, ws: WebSocket) => {
  try{
    const paresedMessage = JSON.parse(message) as Message
    const id = Math.random().toString(36).substring(7)

    if(!paresedMessage.content){
      return ws.send(
        JSON.stringify({type: "error", data: "Invalid message format."})
      )
    }
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
    if(paresedMessage.type === "message"){
      paresedMessage.focus = "webSearch"
      switch(paresedMessage.focus){
        case "webSearch":{
          const emitter = handleWebSearch(paresedMessage.content, history);
          emitter.on("data", (data) => {
            const paresedData = JSON.parse(data);
            if(paresedData.type === "response"){
              ws.send(
                JSON.stringify({
                  type: "response",
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
        }
      }
    }
  } catch(e){
    console.log("Failed to handle message", e);
    ws.send(JSON.stringify({type: "error", data: "Invalid message format"}))
  }
}