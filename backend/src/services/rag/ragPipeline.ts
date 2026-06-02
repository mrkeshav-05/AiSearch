import { getEmbeddingProvider, getLLMProvider } from './providers/provider.factory';
import { hybridSearch } from './vectorStore';
import type { StoredChunk } from './vectorStore';
import type { ChatMessage, StreamChunk } from './providers/llm.interface';

export interface Citation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  chunkIndex: number;
  snippet: string;
}

export interface RetrievedChunk extends StoredChunk {
  documentTitle: string;
}

/** Fetch document title for each unique documentId in one query. */
import { pool } from '../../db/database';

async function fetchTitles(documentIds: string[]): Promise<Map<string, string>> {
  if (documentIds.length === 0) return new Map();
  const result = await pool.query<{ id: string; title: string }>(
    'SELECT id, title FROM documents WHERE id = ANY($1)',
    [documentIds]
  );
  return new Map(result.rows.map((r) => [r.id, r.title]));
}

/**
 * Retrieve the most relevant chunks for a query.
 */
async function retrieve(
  query: string,
  userId: string,
  documentIds?: string[],
  topK = 6
): Promise<RetrievedChunk[]> {
  const embeddingProvider = getEmbeddingProvider();
  const queryEmbedding = await embeddingProvider.embed(query);

  const chunks = await hybridSearch(query, queryEmbedding, userId, documentIds, topK);

  const uniqueDocIds = [...new Set(chunks.map((c) => c.documentId))];
  const titles = await fetchTitles(uniqueDocIds);

  return chunks.map((c) => ({
    ...c,
    documentTitle: titles.get(c.documentId) ?? 'Unknown document',
  }));
}

/** Turn retrieved chunks into a formatted context block for the LLM. */
function buildContextBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] "${c.documentTitle}" — page ${c.pageNumber ?? '?'}\n${c.content}`
    )
    .join('\n\n---\n\n');
}

/** Build citations array from chunks (snippet = first 200 chars). */
function buildCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((c) => ({
    chunkId: c.id,
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    snippet: c.content.slice(0, 200).trim() + (c.content.length > 200 ? '…' : ''),
  }));
}

const SYSTEM_PROMPT = `You are a helpful research assistant.
Answer questions based ONLY on the provided document context.
Always cite the source number (e.g. [Source 1]) when using information from the context.
If the answer is not found in the context, say "I couldn't find that in the provided documents."
Be concise and accurate.`;

/**
 * Non-streaming RAG answer.
 */
export async function ragAnswer(
  query: string,
  history: ChatMessage[],
  userId: string,
  documentIds?: string[]
): Promise<{ answer: string; citations: Citation[] }> {
  const chunks = await retrieve(query, userId, documentIds);
  const context = buildContextBlock(chunks);
  const citations = buildCitations(chunks);

  const messages: ChatMessage[] = [
    ...history,
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${query}`,
    },
  ];

  const llm = getLLMProvider();
  const answer = await llm.chat(messages, { temperature: 0.2 });
  return { answer, citations };
}

/**
 * Streaming RAG answer — yields text chunks then a final citations event.
 * The caller is responsible for writing SSE frames.
 */
export async function* ragAnswerStream(
  query: string,
  history: ChatMessage[],
  userId: string,
  documentIds?: string[]
): AsyncGenerator<StreamChunk | { type: 'citations'; citations: Citation[] }> {
  const chunks = await retrieve(query, userId, documentIds);
  const context = buildContextBlock(chunks);
  const citations = buildCitations(chunks);

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${query}`,
    },
  ];

  const llm = getLLMProvider();
  for await (const chunk of llm.chatStream(messages, { temperature: 0.2 })) {
    yield chunk;
    if (chunk.done) break;
  }

  yield { type: 'citations', citations };
}
