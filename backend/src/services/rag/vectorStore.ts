import { pool } from '../../db/database';
import { getEmbeddingProvider } from './providers/provider.factory';
import type { TextChunk } from './chunker';

export interface StoredChunk {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number;
  tokenCount: number;
  similarity?: number;
}

/**
 * Persist chunks + their embeddings for a document.
 * Existing chunks for the document are deleted first (idempotent re-index).
 */
export async function upsertChunks(
  documentId: string,
  userId: string,
  chunks: TextChunk[],
  chunkIds: string[]
): Promise<void> {
  const embeddingProvider = getEmbeddingProvider();

  // Delete existing chunks (embeddings cascade via DB FK)
  await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);

  const BATCH = 20;
  for (let start = 0; start < chunks.length; start += BATCH) {
    const batch = chunks.slice(start, start + BATCH);
    const batchIds = chunkIds.slice(start, start + BATCH);

    // Embed the batch
    const embeddings = await embeddingProvider.embedBatch(batch.map((c) => c.content));

    for (let i = 0; i < batch.length; i++) {
      const chunk = batch[i];
      const id = batchIds[i];
      const embedding = embeddings[i];

      // Vector literal that pgvector understands: '[0.1,0.2,...]'
      const vectorLiteral = `[${embedding.join(',')}]`;

      await pool.query(
        `INSERT INTO document_chunks
           (id, document_id, user_id, content, chunk_index, page_number, token_count, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
         ON CONFLICT (id) DO UPDATE
           SET content     = EXCLUDED.content,
               chunk_index = EXCLUDED.chunk_index,
               page_number = EXCLUDED.page_number,
               token_count = EXCLUDED.token_count,
               embedding   = EXCLUDED.embedding`,
        [id, documentId, userId, chunk.content, chunk.chunkIndex, chunk.pageNumber, chunk.tokenCount, vectorLiteral]
      );
    }
  }
}

/**
 * Cosine-similarity vector search against all indexed chunks for a user.
 *
 * @param queryEmbedding  Embedding of the query text.
 * @param userId          Restrict search to this user's documents.
 * @param documentIds     Optional filter: only search these documents.
 * @param topK            Number of results to return (default 6).
 */
export async function similaritySearch(
  queryEmbedding: number[],
  userId: string,
  documentIds?: string[],
  topK = 6
): Promise<StoredChunk[]> {
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  const docFilter = documentIds && documentIds.length > 0
    ? 'AND dc.document_id = ANY($4)'
    : '';

  const params: unknown[] = [vectorLiteral, userId, topK];
  if (documentIds && documentIds.length > 0) params.push(documentIds);

  const sql = `
    SELECT
      dc.id,
      dc.document_id  AS "documentId",
      dc.user_id      AS "userId",
      dc.content,
      dc.chunk_index  AS "chunkIndex",
      dc.page_number  AS "pageNumber",
      dc.token_count  AS "tokenCount",
      1 - (dc.embedding <=> $1::vector) AS similarity
    FROM document_chunks dc
    WHERE dc.user_id = $2
      AND dc.embedding IS NOT NULL
      ${docFilter}
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $3
  `;

  const result = await pool.query<StoredChunk>(sql, params);
  return result.rows;
}

/**
 * Hybrid search: vector similarity + full-text keyword search, RRF-fused.
 * Falls back to pure similarity search if pg full-text gives no results.
 */
export async function hybridSearch(
  queryText: string,
  queryEmbedding: number[],
  userId: string,
  documentIds?: string[],
  topK = 6
): Promise<StoredChunk[]> {
  const vectorLiteral = `[${queryEmbedding.join(',')}]`;
  const docFilter = documentIds && documentIds.length > 0
    ? 'AND dc.document_id = ANY($4::text[])'
    : '';

  const params: unknown[] = [vectorLiteral, userId, topK];
  if (documentIds && documentIds.length > 0) params.push(documentIds);

  // Sanitise query for tsquery (replace spaces with & for AND match)
  const tsQuery = queryText.trim().split(/\s+/).filter(Boolean).join(' & ');
  const ftParam = params.length + 1;
  params.push(tsQuery);

  const sql = `
    WITH vector_ranked AS (
      SELECT
        dc.id,
        dc.document_id  AS "documentId",
        dc.user_id      AS "userId",
        dc.content,
        dc.chunk_index  AS "chunkIndex",
        dc.page_number  AS "pageNumber",
        dc.token_count  AS "tokenCount",
        ROW_NUMBER() OVER (ORDER BY dc.embedding <=> $1::vector) AS rank
      FROM document_chunks dc
      WHERE dc.user_id = $2
        AND dc.embedding IS NOT NULL
        ${docFilter}
      LIMIT 20
    ),
    text_ranked AS (
      SELECT
        dc.id,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank(to_tsvector('english', dc.content),
                           to_tsquery('english', $${ftParam})) DESC
        ) AS rank
      FROM document_chunks dc
      WHERE dc.user_id = $2
        AND to_tsvector('english', dc.content) @@ to_tsquery('english', $${ftParam})
        ${docFilter}
      LIMIT 20
    ),
    rrf AS (
      SELECT
        vr.id,
        vr."documentId",
        vr."userId",
        vr.content,
        vr."chunkIndex",
        vr."pageNumber",
        vr."tokenCount",
        (1.0 / (60 + vr.rank)) + COALESCE(1.0 / (60 + tr.rank), 0) AS score
      FROM vector_ranked vr
      LEFT JOIN text_ranked tr ON tr.id = vr.id
    )
    SELECT *, score AS similarity
    FROM rrf
    ORDER BY score DESC
    LIMIT $3
  `;

  try {
    const result = await pool.query<StoredChunk>(sql, params);
    if (result.rows.length > 0) return result.rows;
  } catch {
    // tsquery can fail on special characters — fall through to vector-only
  }

  // Fallback: pure similarity
  return similaritySearch(queryEmbedding, userId, documentIds, topK);
}
