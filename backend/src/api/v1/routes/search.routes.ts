import { Router, Request, Response } from 'express';
import { searchSearxng } from '../../../services/external/core/searxng';

export const searchRoutes: Router = Router();

// GET /api/v1/search/web?q=...&page=1&category=general
searchRoutes.get('/web', async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const category = (req.query.category as string) || 'general';

  try {
    const { results, suggestions } = await searchSearxng(q, {
      categories: [category],
      pageno: page,
      language: 'en',
    });
    res.json({ results, suggestions, query: q, page, category });
  } catch (err) {
    console.error('[search/web] error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default searchRoutes;