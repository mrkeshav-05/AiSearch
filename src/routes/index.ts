// Main API Routes Configuration
// This file defines the routing structure for all REST API endpoints
// Note: Primary search functionality uses WebSocket, not REST routes

import express from "express";
import imagesRouter from "./images";
import videosRouter from "./videos"; // Temporarily disabled due to TypeScript issues
import suggestionsRouter from "./suggestions";

// Create main router instance for mounting sub-routes
const router = express.Router();

/**
 * Image Search Routes
 * 
 * Available endpoints:
 * - POST /api/images - Image search functionality
 * - GET /api/images/health - Health check for image search
 * 
 * Purpose:
 * - Handles image-specific search requests
 * - Separate from main WebSocket-based web search
 * - REST API for image operations that don't require real-time streaming
 */
router.use("/images", imagesRouter);

/**
 * Video Search Routes - Temporarily disabled due to TypeScript issues
 * 
 * Available endpoints (when enabled):
 * - POST /api/videos - Video search functionality using YouTube engine
 * - GET /api/videos/health - Health check for video search
 * 
 * Purpose:
 * - Handles video-specific search requests via REST API
 * - Alternative to WebSocket-based video search for direct API access
 * - Useful for external integrations and non-streaming applications
 */
router.use("/videos", videosRouter); // Temporarily disabled

/**
 * Suggestions Routes
 * 
 * Available endpoints:
 * - POST /api/suggestions - Generate AI-powered suggestions based on chat history
 * 
 * Purpose:
 * - Provides follow-up question suggestions to enhance user experience
 * - Analyzes conversation context to generate relevant queries
 * - Uses LangChain with Google Gemini for intelligent suggestion generation
 */
router.use("/suggestions", suggestionsRouter);

// Note: All search functionality (web, YouTube, Reddit, academic, video, Pinterest) 
// is handled via WebSocket in websocket/messageHandler.ts for real-time streaming responses
// No REST endpoints needed for search operations due to streaming requirements

export default router;