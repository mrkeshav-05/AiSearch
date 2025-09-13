// Image Search API Routes
// Handles REST API endpoints for image search functionality
// Unlike web search, image search uses traditional REST API instead of WebSocket

import express from 'express';
import imageSearchChain from '../agents/imageSearchAgent';

// Create router instance for image-specific routes
const router = express.Router();

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

    // Execute image search using dedicated image search agent
    // Returns array of image results with metadata
    const images = await imageSearchChain.invoke({
      chat_history,
      query,
    })
    
    // Return successful response with image results
    res.status(200).json({images});
  }catch(err){
    // Handle errors with generic message to avoid exposing internal details
    res.status(500).json({message: "An error has occurred."});
    
    // Log detailed error information for debugging
    if (err instanceof Error) {
      console.log(err.message);
    } else {
      console.log(String(err));
    }
  }
});

export default router;