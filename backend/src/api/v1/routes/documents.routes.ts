import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { pool } from '../../../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { indexingQueue } from '../../../services/rag/indexingQueue';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads';
const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES || '52428800', 10); // 50 MB

// Ensure upload dir exists at startup
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => cb(null, `${randomUUID()}.pdf`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are accepted'));
  },
});

// ── POST /upload ──────────────────────────────────────────────────────────────
router.post(
  '/upload',
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const docId = randomUUID();
    const title = (req.body.title as string | undefined)?.trim() || req.file.originalname.replace(/\.pdf$/i, '');

    await pool.query(
      `INSERT INTO documents
         (id, user_id, title, filename, file_path, file_size, mime_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,'application/pdf','uploaded')`,
      [docId, userId, title, req.file.originalname, req.file.path, req.file.size]
    );

    // Kick off background indexing
    indexingQueue.enqueue({ documentId: docId, filePath: req.file.path, userId });

    res.status(202).json({
      id: docId,
      title,
      status: 'uploaded',
      filename: req.file.originalname,
      fileSize: req.file.size,
    });
  }
);

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const result = await pool.query(
    `SELECT id, title, filename, file_size AS "fileSize", mime_type AS "mimeType",
            status, error_msg AS "errorMsg", page_count AS "pageCount",
            chunk_count AS "chunkCount", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM documents
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  res.json({ documents: result.rows });
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const result = await pool.query(
    `SELECT id, title, filename, file_size AS "fileSize", mime_type AS "mimeType",
            status, error_msg AS "errorMsg", page_count AS "pageCount",
            chunk_count AS "chunkCount", metadata, created_at AS "createdAt", updated_at AS "updatedAt"
     FROM documents WHERE id = $1 AND user_id = $2`,
    [req.params.id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json(result.rows[0]);
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const result = await pool.query<{ file_path: string }>(
    'DELETE FROM documents WHERE id = $1 AND user_id = $2 RETURNING file_path',
    [req.params.id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  // Best-effort file removal
  fs.unlink(result.rows[0].file_path).catch(() => {});
  res.json({ success: true });
});

// ── POST /:id/reindex ─────────────────────────────────────────────────────────
router.post('/:id/reindex', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthRequest).user!.id;
  const result = await pool.query<{ file_path: string }>(
    `UPDATE documents
     SET status = 'uploaded', error_msg = NULL, chunk_count = 0, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING file_path`,
    [req.params.id, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  indexingQueue.enqueue({ documentId: req.params.id, filePath: result.rows[0].file_path, userId });
  res.json({ success: true, status: 'uploaded' });
});

export default router;
