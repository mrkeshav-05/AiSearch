// Image Search API Routes
// Handles REST API endpoints for image search functionality
// Unlike web search, image search uses traditional REST API instead of WebSocket

import express, { Router } from 'express';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import imageSearchChain from '../../../services/ai/agents/imageSearchAgent';
import { getCached, setCached, normalizeQuery } from '../../../services/cache/redis';

// Create router instance for image-specific routes
export const router: Router = express.Router();
export const healthRoutes: Router = Router();

/**
 * POST /api/images
 * 
 * Searches for images based on user query and chat history
 * 
 * Request Body:
 * {
 *   query: string - User's search query for images
 *   chat_history: Array<[string, string]> - Previous conversation context
 * }
 * 
 * Response Format:
 * Success (200):
 * {
 *   images: Array<{
 *     title: string,
 *     url: string,
 *     img_src: string,
 *     content?: string
 *   }>
 * }
 * 
 * Error (500):
 * {
 *   message: "An error has occurred."
 * }
 * 
 * Process:
 * 1. Extract query and chat history from request body
 * 2. Invoke image search chain with provided parameters
 * 3. Return formatted image results
 * 4. Handle errors with appropriate status codes and logging
 */
router.post("/", async (req, res) => {
  try{
    // Extract search parameters from request body
    const {query, chat_history} = req.body;

    const normalizedQ = normalizeQuery(query);
    const cacheKey = `cache:images:${normalizedQ}`;

    const cachedImages = await getCached<any[]>(cacheKey);
    if (cachedImages) {
      res.status(200).json({ images: cachedImages });
      return;
    }

    console.log("[Images Route] Query:", query);
    console.log("[Images Route] Chat history type:", typeof chat_history, "Length:", chat_history?.length);

    // Convert chat_history from frontend format to BaseMessage format
    // Frontend sends: Message[] with {content, role} structure
    // Backend needs: BaseMessage[] with proper LangChain message objects
    let formattedHistory: BaseMessage[] = [];
    
    if (Array.isArray(chat_history)) {
      try {
        formattedHistory = chat_history.map((msg: any) => {
          // Handle different possible formats
          if (msg.role === "user" || msg.role === "human") {
            return new HumanMessage({ content: msg.content });
          } else if (msg.role === "assistant" || msg.role === "ai") {
            return new AIMessage({ content: msg.content });
          } else {
            // Fallback for unknown roles
            return new HumanMessage({ content: msg.content || String(msg) });
          }
        });
        console.log("[Images Route] Converted", chat_history.length, "messages to BaseMessage format");
      } catch (conversionError) {
        console.error("[Images Route] Error converting chat history:", conversionError);
        formattedHistory = [];
      }
    }

    // Execute image search using dedicated image search agent
    // Returns array of image results with metadata
    const images = await imageSearchChain.invoke({
      chat_history: formattedHistory,
      query,
    })
    
    if (images && images.length > 0) {
      await setCached(cacheKey, images, 21600); // 6 hours
    }

    console.log("[Images Route] Search completed, returning", images?.length || 0, "images");
    
    // Return successful response with image results
    res.status(200).json({images});
  }catch(err){
    // Return empty array gracefully instead of a 500 error on scraping block/failure
    res.status(200).json({ images: [] });
    
    // Log detailed error information for debugging
    if (err instanceof Error) {
      console.log(err.message);
    } else {
      console.log(String(err));
    }
  }
});

export default router;