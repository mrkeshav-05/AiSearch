import { Router } from 'express';
import { searchRoutes } from './routes/search.routes';
import { suggestionRoutes } from './routes/suggestions.routes';
import { healthRoutes } from './routes/health.routes';
import imagesRouter from './routes/images.routes';
import videosRouter from './routes/videos.routes';
/**
 * API v1 Router
 * 
 * Main router for version 1 of the API
 */
export const apiV1Router: Router = Router();

// Mount routes
apiV1Router.use('/search', searchRoutes);
apiV1Router.use('/suggestions', suggestionRoutes);
apiV1Router.use('/health', healthRoutes);
apiV1Router.use('/images', imagesRouter);
apiV1Router.use('/videos', videosRouter);

export default apiV1Router;