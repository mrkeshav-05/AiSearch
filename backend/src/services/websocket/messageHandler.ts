// WebSocket Message Handler - Processes real-time messages from frontend clients
// Handles different focus modes (webSearch, imageSearch) and routes to appropriate agents

// LangChain imports for message processing
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { WebSocket } from "ws";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { Embeddings } from "@langchain/core/embeddings";
import { createLLM, getEmbeddingsInstance, getActiveProviderInfo } from "../../config";
import handleWebSearch from "../ai/agents/webSearchAgent";
import handleYouTubeSearch from "../ai/agents/youtubeSearchAgent";
import handleRedditSearch from "../ai/agents/redditSearchAgent";
import handleAcademicSearch from "../ai/agents/academicSearchAgent";
import handleVideoSearch from "../ai/agents/videoSearchAgent";
import handleWritingAssistant from "../ai/agents/writingAssistant";
import basicPinterestSearch from "../ai/agents/pinterestSearchAgent";
import { getCached, setCached, normalizeQuery } from "../../services/cache/redis";

// Instantiate the active LLM and embeddings using the central factory.
// Priority: Groq (PRIMARY) → Grok/xAI → OpenAI → Gemini → SearXNG RAW fallback.
const llm: BaseChatModel = createLLM();
const embeddings: Embeddings = getEmbeddingsInstance();

// Log active provider at module load time for easy debugging
const providerInfo = getActiveProviderInfo();
console.log(`[MessageHandler] Active provider: ${providerInfo.providerName} | Model: ${providerInfo.model} | Key env: ${providerInfo.providerKey}`);


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
 * - "youtubeSearch": YouTube video search and analysis
 * - "redditSearch": Reddit discussions search and analysis
 * - "academicSearch": Academic papers search and analysis
 * - "videoSearch": General video search functionality
 * - "pinterestSearch": Pinterest visual content and inspiration search
 * - "writingAssistant": AI writing assistant without web search
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
      const normalizedQ = normalizeQuery(paresedMessage.message);
      const cacheKey = `cache:${focusMode}:${normalizedQ}`;

      // Check Cache
      const cached = await getCached<any>(cacheKey);
      if (cached) {
        if (cached.aiStatus) ws.send(JSON.stringify({ ...cached.aiStatus, messageId: id }));
        if (cached.sources) ws.send(JSON.stringify({ type: "sources", data: cached.sources, messageId: id }));
        if (cached.response) ws.send(JSON.stringify({ type: "message", data: cached.response, messageId: id }));
        ws.send(JSON.stringify({ type: "messageEnd", messageId: id }));
        return;
      }

      // Intercept ws.send to cache the final output
      const originalSend = ws.send.bind(ws);
      let cacheData = { response: "", sources: null, aiStatus: null };
      
      ws.send = (dataStr: any, cb?: any) => {
        try {
          const parsed = JSON.parse(dataStr.toString());
          if (parsed.type === "message") cacheData.response += parsed.data;
          else if (parsed.type === "sources") cacheData.sources = parsed.data;
          else if (parsed.type === "aiStatus") cacheData.aiStatus = parsed;
          else if (parsed.type === "messageEnd") {
            setCached(cacheKey, cacheData, 3600); // 1 hour TTL
          }
        } catch (e) {
          // ignore parse errors
        }
        return originalSend(dataStr, cb);
      };

      // Route to appropriate agent based on focus mode
      switch(focusMode){
        case "webSearch":{
          const { providerName, model } = getActiveProviderInfo();
          console.log(`[WebSearch] Provider: ${providerName} | Model: ${model}`);
          console.log(`[WebSearch] Query: "${paresedMessage.message}"`);

          // Notify frontend which provider is being used
          ws.send(JSON.stringify({
            type: "aiStatus",
            status: "generating",
            provider: providerName,
            model,
            messageId: id,
          }));

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
            // Forward aiStatus events (e.g., fallback/rate-limited) to frontend
            else if(paresedData.type === "aiStatus"){
              ws.send(
                JSON.stringify({
                  type: "aiStatus",
                  ...paresedData,
                  messageId: id,
                })
              )
            }
          })

          emitter.on("end", () => {
            console.log(`[WebSearch] Completed for: "${paresedMessage.message}"`);
            ws.send(JSON.stringify({type: "messageEnd", messageId: id}))
          })
          
          emitter.on("error", (data) => {
            const paresedData = JSON.parse(data);
            console.error(`[WebSearch] Error:`, paresedData.data);
            ws.send(JSON.stringify({type: "error", data: paresedData.data}))
          })
          break;
        }
        case "youtubeSearch":{
          // Initialize YouTube search agent with Gemini AI for video content analysis
          const emitter = handleYouTubeSearch(paresedMessage.message, history, llm, embeddings);
          
          // Handle streaming data from YouTube search agent
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
            // Send YouTube video sources to frontend for citation display
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
          break;
        }
        case "redditSearch":{
          // Initialize Reddit search agent with Gemini AI for Reddit discussions analysis
          const emitter = handleRedditSearch(paresedMessage.message, history, llm, embeddings);
          
          // Handle streaming data from Reddit search agent
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
            // Send Reddit sources to frontend for citation display
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
          break;
        }
        case "academicSearch":{
          // Initialize Academic search agent with Gemini AI for scholarly content analysis
          const emitter = handleAcademicSearch(paresedMessage.message, history, llm, embeddings);
          
          // Handle streaming data from Academic search agent
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
            // Send academic sources to frontend for citation display
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
          break;
        }
        case "videoSearch":{
          // Initialize Video search agent with Gemini AI for video content analysis
          const emitter = handleVideoSearch(paresedMessage.message, history, llm, embeddings);
          
          // Handle streaming data from Video search agent
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
            // Send video sources to frontend for citation display
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
          break;
        }
        case "pinterestSearch":{
          // Initialize Pinterest search agent with Gemini AI for visual inspiration and creative ideas
          const emitter = basicPinterestSearch(
            paresedMessage.message,
            history,
            llm,
            embeddings
          );
          
          // Handle streaming data from Pinterest search agent
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
            
            // Stream sources to frontend for display
            if(paresedData.type === "sources"){
              ws.send(
                JSON.stringify({
                  type: "sources", // Frontend expects "sources" type for search results
                  data: paresedData.data,
                  messageId: id
                })
              )
            }
          })

          emitter.on("end", () => {
            ws.send(JSON.stringify({type: "messageEnd", messageId: id}))
          })
          
          emitter.on("error", (error: any) => {
            console.error("Pinterest search error:", error);
            ws.send(JSON.stringify({type: "error", data: "Pinterest search failed"}))
          })
          break;
        }
        case "writingAssistant":{
          // Initialize Writing Assistant agent with Gemini AI for writing tasks
          const emitter = handleWritingAssistant(paresedMessage.message, history, llm, embeddings);
          
          // Handle streaming data from Writing Assistant agent
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
          })

          emitter.on("end", () => {
            ws.send(JSON.stringify({type: "messageEnd", messageId: id}))
          })
          
          emitter.on("error", (data) => {
            const paresedData = JSON.parse(data);
            ws.send(JSON.stringify({type: "error", data: paresedData.data}))
          })
          break;
        }
      }
    }
  } catch(e){
    console.log("Failed to handle message", e);
    ws.send(JSON.stringify({type: "error", data: "Invalid message format"}))
  }
}