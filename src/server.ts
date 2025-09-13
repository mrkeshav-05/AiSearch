// Main server entry point for AiSearch application
// This file sets up the Express server with WebSocket support for real-time AI search functionality
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import routes from "./routes";
import { startWebSocketServer } from "./websocket";

// Load environment variables from .env file
// Required variables: BACKEND_PORT, GOOGLE_API_KEY, NEXT_PUBLIC_WS_URL
dotenv.config();

// Create Express application instance
// This handles HTTP requests for REST API endpoints
const app = express();

// Create HTTP server instance
// This is wrapped around Express to enable WebSocket support alongside HTTP
const server = http.createServer(app);

// Server configuration
// Default port is 5000, can be overridden via environment variable
const BACKEND_PORT = process.env.BACKEND_PORT || 5000;

// CORS configuration for frontend communication
// Allows requests from any origin for development purposes
// In production, should be restricted to specific domains
const corOptions = {
    origin: "*", // Allow all origins (change for production)
    methods: ["GET", "POST"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type"], // Allowed headers
}

// Apply CORS middleware to all routes
app.use(cors(corOptions));

// Parse JSON request bodies with 50MB limit
// Large limit needed for potential image uploads or large search results
app.use(express.json({ limit: '50mb' }));

// Set request timeout to 3 minutes for all routes
// Extended timeout needed for AI processing and search operations
app.use((req, res, next) => {
    req.setTimeout(180000); // 3 minutes request timeout
    res.setTimeout(180000); // 3 minutes response timeout
    next();
});

// Mount API routes under /api prefix
// All REST endpoints will be available at /api/*
app.use("/api", routes);

// Health check endpoint
// Returns simple status message to verify server is running
app.get("/", (req, res) => {
    res.send("Backend is runnings!");
});

// Start HTTP server on specified port
// Logs server URL for easy access during development
server.listen(BACKEND_PORT, () => {
    console.log(`Server is running on port ${BACKEND_PORT}`);
    console.log(`http://localhost:${BACKEND_PORT}`);
});

// Initialize WebSocket server for real-time communication
// Enables bidirectional communication between frontend and backend
// Used for streaming AI responses and real-time search updates
startWebSocketServer(server);