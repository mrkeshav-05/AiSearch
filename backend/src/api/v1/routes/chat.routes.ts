import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { query } from '../../../db/database';

export const chatRoutes: Router = Router();

// All chat routes require auth
chatRoutes.use(requireAuth);

// ── GET /chat/sessions  — list all sessions for the current user ──────────
chatRoutes.get('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { rows } = await query<{
      id: string; title: string; source: string; created_at: string; updated_at: string;
    }>(
      `SELECT id, title, source, created_at, updated_at
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 50`,
      [userId]
    );
    res.json({ data: { sessions: rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: 'Failed to fetch sessions' } });
  }
});

// ── GET /chat/sessions/:id  — get a single session with messages ──────────
chatRoutes.get('/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { rows: sessions } = await query<{ id: string; title: string; source: string; created_at: string }>(
      'SELECT id, title, source, created_at FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (sessions.length === 0) {
      res.status(404).json({ error: { message: 'Session not found' } });
      return;
    }

    const { rows: messages } = await query<{
      id: string; role: string; content: string; created_at: string;
    }>(
      'SELECT id, role, content, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json({ data: { session: sessions[0], messages } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: 'Failed to fetch session' } });
  }
});

// ── PUT /chat/sessions/:id  — upsert a session + its messages ────────────
chatRoutes.put('/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, messages, source } = req.body as {
      title: string;
      source?: 'ai' | 'search';
      messages: { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }[];
    };

    if (!title || !Array.isArray(messages)) {
      res.status(400).json({ error: { message: 'title and messages are required' } });
      return;
    }

    const sessionSource = source === 'search' ? 'search' : 'ai';

    // Upsert the session
    await query(
      `INSERT INTO chat_sessions (id, user_id, title, source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title, source = EXCLUDED.source, updated_at = NOW()`,
      [id, userId, title, sessionSource]
    );

    // Replace all messages for this session
    await query('DELETE FROM chat_messages WHERE session_id = $1', [id]);
    for (const m of messages) {
      await query(
        `INSERT INTO chat_messages (id, session_id, role, content, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, id, m.role, m.content, m.createdAt]
      );
    }

    res.json({ data: { ok: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: 'Failed to save session' } });
  }
});

// ── DELETE /chat/sessions/:id  — delete a session ────────────────────────
chatRoutes.delete('/sessions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await query('DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2', [id, userId]);
    res.json({ data: { ok: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: 'Failed to delete session' } });
  }
});

// ── DELETE /chat/sessions  — clear all sessions for user ─────────────────
chatRoutes.delete('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    await query('DELETE FROM chat_sessions WHERE user_id = $1', [userId]);
    res.json({ data: { ok: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { message: 'Failed to clear sessions' } });
  }
});
