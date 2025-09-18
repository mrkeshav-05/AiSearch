import express from 'express';
import cors from 'cors';
import { config } from './config';
import { apiV1Router } from './api/v1';
import { websocketService } from './services/websocket';
import { errorHandler } from './api/v1/middleware/error.middleware';

/**
 * Express Application Setup
 * 
 * Configures the main Express application with middleware,
 * routes, and error handling for the AiSearch backend.
 */
export const createApp = (): express.Application => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // API routes
  app.use('/api/v1', apiV1Router);

  // Root endpoint
  app.get("/", (req, res) => {
    res.send("Backend is running!");
  });
  // Error handling
  app.use(errorHandler);

  return app;
};

export default createApp;