import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { startWebSocketServer } from './services/websocket';
import { config } from './config';

/**
 * Main Server Entry Point
 * 
 * Initializes and starts the HTTP server with WebSocket support
 */
const startServer = async () => {
  try {
    // Create Express app
    const app = createApp();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize WebSocket server
    startWebSocketServer(server);
    
    // Start listening
    const port = config.port || 8000;
    server.listen(port, () => {
      console.log(`🚀 AiSearch backend server started on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🔗 WebSocket: ws://localhost:${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();