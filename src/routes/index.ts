// Main API Routes Configuration
// This file defines the routing structure for all REST API endpoints
// Note: Primary search functionality uses WebSocket, not REST routes

import express from "express";
import imagesRouter from "./images";

// Create main router instance for mounting sub-routes
const router = express.Router();

/**
 * Image Search Routes
 * 
 * Available endpoints:
 * - GET /api/images/* - Image search functionality
 * 
 * Purpose:
 * - Handles image-specific search requests
 * - Separate from main WebSocket-based web search
 * - REST API for image operations that don't require real-time streaming
 */
router.use("/images", imagesRouter);

// Note: Web search functionality is handled via WebSocket in websocket/messageHandler.ts
// No REST endpoints needed for web search due to real-time streaming requirements

export default router;