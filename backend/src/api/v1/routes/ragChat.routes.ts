import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../../../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { ragAnswerStream } from '../../../services/rag/ragPipeline';
import type { ChatMessage } from '../../../services/rag/providers/llm.interface';

const router: ReturnType<typeof Router> = Router();

// ── POST /sessions ────────────────────────────────────────────────────────────
router.post('/sessions', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const { title, documentIds } = req.body as { title?: string; documentIds?: string[] };

  if (!documentIds || documentIds.length === 0) {
    res.status(400).json({ error: 'documentIds array is required' });
    return;
  }

  // Verify all documents belong to this user
  const check = await pool.query(
    `SELECT id FROM documents WHERE id = ANY($1) AND user_id = $2 AND status = 'indexed'`,
    [documentIds, userId]
  );
  if (check.rows.length !== documentIds.length) {
    res.status(400).json({ error: 'One or more documents not found or not yet indexed' });
    return;
  }

  const sessionId = randomUUID();
  const sessionTitle = (title?.trim()) || 'New conversation';

  await pool.query(
    `INSERT INTO rag_sessions (id, user_id, title, document_ids)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, sessionTitle, documentIds]
  );

  res.status(201).json({ id: sessionId, title: sessionTitle, documentIds });
});

// ── GET /sessions ─────────────────────────────────────────────────────────────
router.get('/sessions', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const result = await pool.query(
    `SELECT id, title, document_ids AS "documentIds",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM rag_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );
  res.json({ sessions: result.rows });
});

// ── GET /sessions/:id/messages ────────────────────────────────────────────────
router.get('/sessions/:id/messages', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;

  const session = await pool.query(
    'SELECT id FROM rag_sessions WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  );
  if (session.rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const messages = await pool.query(
    `SELECT id, role, content, citations, created_at AS "createdAt"
     FROM rag_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [req.params.id]
  );
  res.json({ messages: messages.rows });
});

// ── DELETE /sessions/:id ──────────────────────────────────────────────────────
router.delete('/sessions/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const result = await pool.query(
    'DELETE FROM rag_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ success: true });
});

// ── POST /sessions/:id/chat  (SSE streaming) ──────────────────────────────────
router.post('/sessions/:id/chat', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const { message } = req.body as { message?: string };

  if (!message?.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  // Verify session ownership
  const session = await pool.query<{ document_ids: string[] }>(
    'SELECT document_ids FROM rag_sessions WHERE id = $1 AND user_id = $2',
    [req.params.id, userId]
  );
  if (session.rows.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const documentIds: string[] = session.rows[0].document_ids;

  // Fetch recent conversation history (last 10 turns)
  const historyResult = await pool.query<{ role: string; content: string }>(
    `SELECT role, content FROM rag_messages
     WHERE session_id = $1 ORDER BY created_at ASC LIMIT 20`,
    [req.params.id]
  );
  const history: ChatMessage[] = historyResult.rows.map((r) => ({
    role: r.role as 'user' | 'assistant',
    content: r.content,
  }));

  // Persist the user message
  const userMsgId = randomUUID();
  await pool.query(
    `INSERT INTO rag_messages (id, session_id, role, content) VALUES ($1,$2,'user',$3)`,
    [userMsgId, req.params.id, message.trim()]
  );

  // ── SSE setup ─────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let fullResponse = '';
  let citations: object[] = [];

  try {
    const stream = ragAnswerStream(message.trim(), history, userId, documentIds);

    for await (const event of stream) {
      if ('type' in event && event.type === 'citations') {
        citations = event.citations;
        send({ type: 'citations', citations });
      } else {
        const chunk = event as { text: string; done: boolean };
        if (!chunk.done && chunk.text) {
          fullResponse += chunk.text;
          send({ type: 'chunk', text: chunk.text });
        }
      }
    }

    // Persist assistant message
    const assistantMsgId = randomUUID();
    await pool.query(
      `INSERT INTO rag_messages (id, session_id, role, content, citations)
       VALUES ($1,$2,'assistant',$3,$4)`,
      [assistantMsgId, req.params.id, fullResponse, JSON.stringify(citations)]
    );

    // Bump session updated_at
    await pool.query(
      'UPDATE rag_sessions SET updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );

    send({ type: 'done' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stream error';
    send({ type: 'error', error: msg });
    console.error('[ragChat] Stream error:', err);
  } finally {
    res.end();
  }
});

export default router;
