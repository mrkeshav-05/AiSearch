export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';

export interface Document {
  id: string;
  title: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  errorMsg?: string;
  pageCount?: number;
  chunkCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RagSession {
  id: string;
  title: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  chunkIndex: number;
  snippet: string;
}

export interface RagMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  createdAt: string;
}

// SSE events from /api/v1/rag/sessions/:id/chat
export type SseChunkEvent = { type: 'chunk'; text: string };
export type SseCitationsEvent = { type: 'citations'; citations: Citation[] };
export type SseDoneEvent = { type: 'done' };
export type SseErrorEvent = { type: 'error'; error: string };
export type SseEvent = SseChunkEvent | SseCitationsEvent | SseDoneEvent | SseErrorEvent;
