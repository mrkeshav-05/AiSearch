'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, Database, Loader2, RotateCcw, Search, Filter, ChevronDown } from 'lucide-react';
import type { Document, RagSession, KnowledgeBaseStats } from '@/types/library.types';
import DocumentUpload from '@/components/library/DocumentUpload';
import DocumentCard from '@/components/library/DocumentCard';
import StatCard from '@/components/library/StatCard';
import EmptyState from '@/components/library/EmptyState';
import RagChat from '@/components/library/RagChat';

type Panel = 'documents' | 'chat';
type SortBy = 'recent' | 'name' | 'size';
type FilterBy = 'all' | 'indexed' | 'processing' | 'failed';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function KnowledgeBasePage() {
  const [panel, setPanel] = useState<Panel>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [activeSession, setActiveSession] = useState<RagSession | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  // Filtering & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [stats, setStats] = useState<KnowledgeBaseStats>({
    totalDocuments: 0,
    indexedDocuments: 0,
    processingDocuments: 0,
    failedDocuments: 0,
    totalChats: 0,
    totalChunks: 0,
    totalSize: 0,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/documents', { headers: authHeaders() });
      const data = await res.json() as { documents?: Document[] };
      const docs = data.documents ?? [];
      setDocuments(docs);

      // Calculate stats
      setStats({
        totalDocuments: docs.length,
        indexedDocuments: docs.filter((d) => d.status === 'indexed').length,
        processingDocuments: docs.filter((d) => d.status === 'processing').length,
        failedDocuments: docs.filter((d) => d.status === 'failed').length,
        totalChats: 0,
        totalChunks: docs.reduce((sum, d) => sum + (d.chunkCount ?? 0), 0),
        totalSize: docs.reduce((sum, d) => sum + d.fileSize, 0),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // Polling
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

  // Filter & sort
  const filtered = documents
    .filter((d) => {
      if (filterBy !== 'all' && d.status !== filterBy) return false;
      if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return b.fileSize - a.fileSize;
      return 0;
    });

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

  const indexedSelected = documents.filter((d) => selectedDocIds.has(d.id) && d.status === 'indexed');
  const canChat = indexedSelected.length > 0 && !startingChat;

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col bg-gradient-to-br from-light-primary via-light-secondary to-light-primary dark:from-dark-primary dark:via-dark-secondary dark:to-dark-primary">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between border-b border-light-200 dark:border-dark-200 bg-light-primary/80 dark:bg-dark-primary/80 px-6 py-4 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 5 }}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#24A0ED] to-[#1a7bc4]"
          >
            <Database className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
            <p className="text-xs text-white/80">Upload and chat with your documents</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {panel === 'chat' && (
            <motion.button
              whileHover={{ x: -2 }}
              onClick={() => { setPanel('documents'); setActiveSession(null); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-light-100 dark:hover:bg-dark-100 transition-colors"
            >
              ← Back
            </motion.button>
          )}

          {panel === 'documents' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => void startChat()}
              disabled={!canChat}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#24A0ED] to-[#1a7bc4] px-4 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-[#24A0ED]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
            >
              {startingChat
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MessageSquarePlus className="h-4 w-4" />
              }
              Chat with {indexedSelected.length > 0 ? `${indexedSelected.length}` : 'selected'}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {panel === 'documents' ? (
            <motion.div
              key="documents"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex h-full flex-col overflow-y-auto"
            >
              {/* Stats cards */}
              {documents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <StatCard label="Total Documents" value={stats.totalDocuments} icon={Database} color="blue" />
                  <StatCard label="Indexed" value={stats.indexedDocuments} icon={Database} color="green" />
                  <StatCard label="Processing" value={stats.processingDocuments} icon={Database} color="yellow" />
                  <StatCard label="Total Chunks" value={stats.totalChunks} icon={Database} color="purple" />
                </motion.div>
              )}

              {/* Main upload section */}
              <div className="space-y-5 px-6 py-5">
                <DocumentUpload onUploaded={() => void fetchDocuments()} />

                {/* Search & Filter */}
                {documents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-[#24A0ED]/50 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative group">
                        <button className="flex items-center gap-1.5 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary px-3 py-2 text-sm font-medium text-white hover:text-white transition-colors">
                          <Filter className="h-4 w-4" />
                          {filterBy === 'all' ? 'All' : filterBy}
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 hidden w-40 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary py-1 shadow-lg group-hover:flex flex-col z-10">
                          {(['all', 'indexed', 'processing', 'failed'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setFilterBy(f)}
                              className={`px-3 py-1.5 text-sm text-left transition-colors ${
                                filterBy === f
                                  ? 'bg-[#24A0ED]/20 text-[#24A0ED] font-medium'
                                  : 'text-light-400 dark:text-dark-400 hover:text-black dark:hover:text-white'
                              }`}
                            >
                              {f === 'all' ? 'All' : f}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative group">
                        <button className="flex items-center gap-1.5 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary px-3 py-2 text-sm font-medium text-white hover:text-white transition-colors">
                          Sort: {sortBy}
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 hidden w-40 rounded-lg border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary py-1 shadow-lg group-hover:flex flex-col z-10">
                          {(['recent', 'name', 'size'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setSortBy(s)}
                              className={`px-3 py-1.5 text-sm text-left transition-colors ${
                                sortBy === s
                                  ? 'bg-[#24A0ED]/20 text-[#24A0ED] font-medium'
                                  : 'text-light-400 dark:text-dark-400 hover:text-black dark:hover:text-white'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ rotate: 180 }}
                        onClick={() => void fetchDocuments()}
                        className="flex items-center justify-center rounded-lg p-2 text-white hover:bg-light-100 dark:hover:bg-dark-100 transition-colors"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Document grid or empty state */}
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-light-400 dark:text-dark-400" />
                  </div>
                ) : documents.length === 0 ? (
                  <EmptyState />
                ) : (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center justify-between pb-2"
                    >
                      <p className="text-sm font-medium text-white">
                        {filtered.length} document{filtered.length !== 1 ? 's' : ''}
                        {selectedDocIds.size > 0 && ` · ${selectedDocIds.size} selected`}
                      </p>
                    </motion.div>

                    <motion.div
                      layout
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {filtered.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          doc={doc}
                          selected={selectedDocIds.has(doc.id)}
                          onToggleSelect={toggleSelect}
                          onDelete={(id) => void deleteDocument(id)}
                          onReindex={(id) => void reindexDocument(id)}
                        />
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full overflow-hidden"
            >
              {activeSession && <RagChat sessionId={activeSession.id} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

