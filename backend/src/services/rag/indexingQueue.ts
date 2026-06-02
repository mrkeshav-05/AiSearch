import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { pool } from '../../db/database';
import { parsePDF } from './pdfProcessor';
import { chunkText } from './chunker';
import { upsertChunks } from './vectorStore';

interface QueueItem {
  documentId: string;
  filePath: string;
  userId: string;
}

/**
 * In-process serial indexing queue.
 * Documents are processed one at a time to avoid embedding API rate limits.
 * Swap for BullMQ / SQS when horizontal scaling is needed.
 */
class IndexingQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processing = false;

  /** Add a document to the indexing queue and kick off processing. */
  enqueue(item: QueueItem): void {
    this.queue.push(item);
    if (!this.processing) void this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const item = this.queue.shift()!;

    try {
      await this.indexDocument(item);
    } catch (err) {
      console.error(`[IndexingQueue] Fatal error for doc ${item.documentId}:`, err);
    }

    this.processing = false;
    if (this.queue.length > 0) void this.processNext();
  }

  private async indexDocument(item: QueueItem): Promise<void> {
    const { documentId, filePath, userId } = item;

    // ── 1. Mark as processing ─────────────────────────────────────────────────
    await pool.query(
      `UPDATE documents SET status = 'processing', updated_at = NOW() WHERE id = $1`,
      [documentId]
    );

    try {
      // ── 2. Parse PDF ──────────────────────────────────────────────────────
      const { text, pageCount, pageOffsets } = await parsePDF(filePath);

      if (!text.trim()) throw new Error('PDF contains no extractable text');

      // ── 3. Chunk ──────────────────────────────────────────────────────────
      const chunks = chunkText(text, pageOffsets);

      // ── 4. Generate stable chunk IDs ─────────────────────────────────────
      const chunkIds = chunks.map(() => randomUUID());

      // ── 5. Embed + persist ────────────────────────────────────────────────
      await upsertChunks(documentId, userId, chunks, chunkIds);

      // ── 6. Mark indexed ───────────────────────────────────────────────────
      await pool.query(
        `UPDATE documents
         SET status = 'indexed', page_count = $2, chunk_count = $3, updated_at = NOW()
         WHERE id = $1`,
        [documentId, pageCount, chunks.length]
      );

      this.emit('indexed', { documentId, chunkCount: chunks.length });
      console.log(`[IndexingQueue] Indexed doc ${documentId}: ${chunks.length} chunks`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await pool.query(
        `UPDATE documents SET status = 'failed', error_msg = $2, updated_at = NOW() WHERE id = $1`,
        [documentId, msg]
      );
      this.emit('failed', { documentId, error: msg });
      console.error(`[IndexingQueue] Failed doc ${documentId}:`, msg);
    }
  }
}

// Singleton queue
export const indexingQueue = new IndexingQueue();
