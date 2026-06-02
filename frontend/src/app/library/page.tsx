'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquarePlus, BookOpenText, Loader2, RotateCcw } from 'lucide-react';
import type { Document, RagSession } from '@/types/library.types';
import DocumentUpload from '@/components/library/DocumentUpload';
import DocumentCard from '@/components/library/DocumentCard';
import RagChat from '@/components/library/RagChat';

type Panel = 'documents' | 'chat';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function LibraryPage() {
  const [panel, setPanel] = useState<Panel>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [activeSession, setActiveSession] = useState<RagSession | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/documents', { headers: authHeaders() });
      const data = await res.json() as { documents?: Document[] };
      setDocuments(data.documents ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // Poll while any document is still processing
  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const needsPoll = documents.some((d) => d.status === 'uploaded' || d.status === 'processing');
    if (needsPoll && !pollRef.current) {
      pollRef.current = setInterval(() => void fetchDocuments(), 3000);
    } else if (!needsPoll && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [documents, fetchDocuments]);

  function toggleSelect(id: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function deleteDocument(id: string) {
    await fetch(`/api/v1/documents/${id}`, { method: 'DELETE', headers: authHeaders() });
    setSelectedDocIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    void fetchDocuments();
  }

  async function reindexDocument(id: string) {
    await fetch(`/api/v1/documents/${id}/reindex`, { method: 'POST', headers: authHeaders() });
    void fetchDocuments();
  }

  async function startChat() {
    if (selectedDocIds.size === 0) return;
    setStartingChat(true);
    try {
      const res = await fetch('/api/v1/rag/sessions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ documentIds: [...selectedDocIds] }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        alert(err.error ?? 'Failed to create session');
        return;
      }
      const session = await res.json() as RagSession;
      setActiveSession(session);
      setPanel('chat');
    } catch (e) {
      console.error(e);
    } finally {
      setStartingChat(false);
    }
  }

  const indexedSelected = documents.filter(
    (d) => selectedDocIds.has(d.id) && d.status === 'indexed'
  );
  const canChat = indexedSelected.length > 0 && !startingChat;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-light-200 dark:border-dark-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <BookOpenText className="h-5 w-5 text-[#24A0ED]" />
          <h1 className="text-base font-semibold text-black dark:text-white">Library</h1>
        </div>

        <div className="flex items-center gap-2">
          {panel === 'chat' && (
            <button
              onClick={() => { setPanel('documents'); setActiveSession(null); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-light-400 dark:text-dark-400 hover:bg-light-100 dark:hover:bg-dark-100 transition-colors"
            >
              ← Back to documents
            </button>
          )}

          {panel === 'documents' && (
            <button
              onClick={() => void startChat()}
              disabled={!canChat}
              className="flex items-center gap-1.5 rounded-lg bg-[#24A0ED] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#24A0ED]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {startingChat
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MessageSquarePlus className="h-4 w-4" />
              }
              Chat with {indexedSelected.length > 0 ? `${indexedSelected.length} ` : ''}selected
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {panel === 'documents' ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <DocumentUpload onUploaded={() => void fetchDocuments()} />

          {/* Document grid */}
          {loadingDocs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-light-400 dark:text-dark-400" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <BookOpenText className="h-9 w-9 text-light-200 dark:text-dark-200" />
              <p className="text-sm text-light-400 dark:text-dark-400">No documents yet — upload a PDF to get started</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-light-400 dark:text-dark-400">
                  {documents.length} document{documents.length !== 1 ? 's' : ''}
                  {selectedDocIds.size > 0 && ` · ${selectedDocIds.size} selected`}
                </p>
                <button
                  onClick={() => void fetchDocuments()}
                  className="flex items-center gap-1 text-xs text-light-400 dark:text-dark-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    selected={selectedDocIds.has(doc.id)}
                    onToggleSelect={toggleSelect}
                    onDelete={(id) => void deleteDocument(id)}
                    onReindex={(id) => void reindexDocument(id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {activeSession && <RagChat sessionId={activeSession.id} />}
        </div>
      )}
    </div>
  );
}
