'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, BookOpen, Copy, Check } from 'lucide-react';
import type { RagMessage, Citation } from '@/types/library.types';
import CitationModal from './CitationModal';

interface RagChatProps {
  sessionId: string;
}

function parseSse(raw: string) {
  const lines = raw.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      try {
        return JSON.parse(line.slice(5).trim()) as Record<string, unknown>;
      } catch { /* skip */ }
    }
  }
  return null;
}

export default function RagChat({ sessionId }: RagChatProps) {
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch(`/api/v1/rag/sessions/${sessionId}/messages`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { messages?: RagMessage[] }) => setMessages(data.messages ?? []))
      .catch(console.error);
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);

    // Optimistic user message
    const userMsg: RagMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Streaming assistant message placeholder
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', citations: [], createdAt: new Date().toISOString() },
    ]);

    let buffer = '';
    let citations: Citation[] = [];

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/v1/rag/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split('\n\n');
        sseBuffer = parts.pop() ?? '';

        for (const part of parts) {
          const event = parseSse(part);
          if (!event) continue;

          if (event.type === 'chunk' && typeof event.text === 'string') {
            buffer += event.text;
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: buffer } : m)
            );
          } else if (event.type === 'citations') {
            citations = event.citations as Citation[];
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, citations } : m)
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error generating response';
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: `⚠ ${msg}` } : m)
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 sm:p-6">
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full gap-4 text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="rounded-full bg-[#24A0ED]/10 p-4"
            >
              <BookOpen className="h-10 w-10 text-[#24A0ED]" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-white">Start asking questions</p>
              <p className="text-xs mt-1 text-white/70">Ask about the selected documents and get sourced answers</p>
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full
              ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-[#24A0ED] to-[#1a7bc4] text-white'
                  : 'bg-light-100 dark:bg-dark-100 text-light-400 dark:text-dark-400'
              }`}
            >
              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </motion.div>

            <div className={`max-w-[80%] space-y-2`}>
              {/* Message bubble */}
              <motion.div
                layoutId={`msg-${msg.id}`}
                className={`group rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-all
                ${
                  msg.role === 'user'
                    ? 'bg-[#24A0ED] text-white rounded-tr-sm'
                    : 'bg-light-secondary dark:bg-dark-secondary text-black dark:text-white rounded-tl-sm border border-light-200 dark:border-dark-200'
                }`}
              >
                {msg.content || (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                    <Loader2 className="h-4 w-4 text-light-400" />
                  </motion.div>
                )}
              </motion.div>

              {/* Copy button */}
              {msg.role === 'assistant' && msg.content && (
                <motion.button
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  onClick={() => copyToClipboard(msg.content, msg.id)}
                  className="flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
                >
                  {copiedId === msg.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </motion.button>
              )}

              {/* Citations */}
              {msg.citations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap gap-1.5"
                >
                  {msg.citations.slice(0, 5).map((cite, i) => (
                    <motion.button
                      key={cite.chunkId}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setActiveCitation(cite)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-light-200 dark:border-dark-200 bg-light-100 dark:bg-dark-100 px-2.5 py-1 text-xs text-white hover:border-[#24A0ED]/50 hover:text-[#24A0ED] hover:bg-[#24A0ED]/5 transition-all"
                    >
                      <span className="font-bold text-[#24A0ED]">[{i + 1}]</span>
                      <span className="max-w-[100px] truncate">{cite.documentTitle}</span>
                      {cite.pageNumber && <span>p.{cite.pageNumber}</span>}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary p-4 sm:p-6">
        <div className="flex items-end gap-2 rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary px-4 py-3 focus-within:ring-2 focus-within:ring-[#24A0ED]/50 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents… (Enter to send)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => void sendMessage()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 flex items-center justify-center rounded-lg p-2 text-[#24A0ED] hover:bg-[#24A0ED]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>
        <p className="mt-2 text-center text-xs text-white/70">
          Responses are sourced from your uploaded documents
        </p>
      </div>

      {/* Citation modal */}
      {activeCitation && (
        <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
      )}
    </div>
  );
}
