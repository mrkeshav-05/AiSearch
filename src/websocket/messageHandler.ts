// WebSocket Message Handler - Processes real-time messages from frontend clients
// Handles different focus modes (webSearch, imageSearch) and routes to appropriate agents

// LangChain imports for message processing and AI model integration
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { WebSocket } from "ws";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import handleWebSearch from "../agents/webSearchAgent";

// Initialize Google Gemini LLM for AI response generation
// Temperature 0.7 provides balanced creativity vs consistency
const llm = new ChatGoogleGenerativeAI({
  modelName: "gemini-2.0-flash", // Latest Gemini model for optimal performance
  temperature: 0.7, // Balanced creativity level
}) as BaseChatModel;

// Initialize Google embeddings for semantic similarity computation
// Used for document reranking and relevance scoring
const embeddings = new GoogleGenerativeAIEmbeddings({
  modelName: "text-embedding-004", // Latest embedding model
}) as Embeddings;

/**
 * Message structure received from frontend via WebSocket
 * 
 * @property type - Message type (typically "message")
 * @property message - User's query text
 * @property copilot - Optional copilot mode (future feature)
 * @property focusMode - Search mode: "webSearch" | "imageSearch" | etc.
 * @property history - Conversation history as [role, content] pairs
 */
type Message = {
  type: string;
  message: string;
  copilot?: string;
  focusMode: string;
  history: Array<[string, string]>;
}

/**
 * Main WebSocket message handler - Processes incoming messages and routes to appropriate agents
 * 
 * @param message - JSON string containing user message and metadata
 * @param ws - WebSocket connection to send responses back to client
 * 
 * Message Processing Flow:
 * 1. Parse incoming JSON message from frontend
 * 2. Validate message format and content
 * 3. Convert chat history to LangChain format
 * 4. Route to appropriate agent based on focusMode
 * 5. Handle streaming responses and emit to client
 * 
 * Supported Focus Modes:
 * - "webSearch": Web search with AI response generation
 * - "imageSearch": Image search functionality (future)
 * 
 * Response Types Sent to Frontend:
 * - { type: "message", data: string, messageId: string } - AI response chunks
 * - { type: "sources", data: Document[], messageId: string } - Search sources
 * - { type: "messageEnd", messageId: string } - Completion signal
 * - { type: "error", data: string } - Error messages
 */
export const handleMessage = async (message: string, ws: WebSocket) => {
  try{
    console.log("[BACKEND] Received message:", message);
    const paresedMessage = JSON.parse(message) as Message
    console.log("[BACKEND] Parsed message:", paresedMessage);
    
    // Generate unique message ID for tracking responses
    const id = Math.random().toString(36).substring(7)
    
    // Validate message content
    if(!paresedMessage.message){
      return ws.send(
        JSON.stringify({type: "error", data: "Invalid message format."})
      )
    }
    
    // Convert chat history from frontend format to LangChain BaseMessage format
    // Frontend sends: [["human", "text"], ["assistant", "text"]]
    // LangChain needs: [HumanMessage, AIMessage] objects
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
    
    // Convert history to string format for legacy compatibility
    // Some prompts may still use string-based chat history
    const chat_history = paresedMessage.history
      .map(([role, content]) => `${role}: ${content}`)
      .join('\n');
    
    console.log("[BACKEND] Formatted chat_history:", chat_history);
    
    // Process message based on type
    if(paresedMessage.type === "message"){
      const focusMode = paresedMessage.focusMode || "webSearch"
      
      // Route to appropriate agent based on focus mode
      switch(focusMode){
        case "webSearch":{
          // Initialize web search agent with user query and conversation history
          const emitter = handleWebSearch(paresedMessage.message, history, llm, embeddings);
          
          // Handle streaming data from web search agent
          emitter.on("data", (data) => {
            const paresedData = JSON.parse(data);
            
            // Stream AI response chunks to frontend for real-time display
            if(paresedData.type === "response"){
              ws.send(
                JSON.stringify({
                  type: "message", // Frontend expects "message" type for AI responses
                  data: paresedData.data,
                  messageId: id
                })
              )
            }
            // Send search sources to frontend for citation display
            else if(paresedData.type === "sources"){
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