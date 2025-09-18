import { Router } from 'express';

/**
 * Health Routes
 * 
 * Health check and status endpoints
 */
export const healthRoutes: Router = Router();

healthRoutes.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

export default healthRoutes;