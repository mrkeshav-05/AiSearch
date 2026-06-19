'use client';

import {
  useState, useRef, useEffect, useCallback,
  type KeyboardEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'markdown-to-jsx';
import TextareaAutosize from 'react-textarea-autosize';
import {
  Send, Bot, User, Loader2, BookOpen, Copy, Check,
  FileText, Sparkles, List, BarChart2, ChevronRight,
  X, ExternalLink, Hash, Quote,
} from 'lucide-react';
import type { RagMessage, Citation } from '@/types/library.types';

interface RagChatProps {
  sessionId: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Quick-action suggestions shown on empty state
const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    label: 'Summarize the document',
    prompt: 'Please provide a comprehensive summary of this document, covering the main topics, key findings, and important conclusions.',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
  },
  {
    icon: List,
    label: 'Key takeaways',
    prompt: 'What are the top 5-7 key takeaways or most important points from this document? Format as a numbered list.',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
  },
  {
    icon: BarChart2,
    label: 'Data & statistics',
    prompt: 'Extract all important numbers, statistics, percentages, dates, and data points mentioned in this document.',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    icon: FileText,
    label: 'Table of contents',
    prompt: 'Based on the document content, create a structured outline or table of contents that reflects the main sections and topics covered.',
    color: '#24A0ED',
    bg: 'rgba(36,160,237,0.12)',
  },
];

// SSE parser
function parseSse(raw: string): Record<string, unknown> | null {
  for (const line of raw.split('\n')) {
    if (line.startsWith('data:')) {
      try { return JSON.parse(line.slice(5).trim()); } catch { /* skip */ }
    }
  }
  return null;
}

// Typing dots animation
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
          className="block h-1.5 w-1.5 rounded-full bg-[#24A0ED]"
        />
      ))}
    </div>
  );
}

// Citation pill
function CitationPill({
  citation, index, onClick,
}: { citation: Citation; index: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70 hover:border-[#24A0ED]/60 hover:text-[#24A0ED] hover:bg-[#24A0ED]/8 transition-all"
    >
      <span className="font-bold text-[#24A0ED]">[{index + 1}]</span>
      <span className="max-w-[120px] truncate">{citation.documentTitle}</span>
      {citation.pageNumber && (
        <span className="text-white/40">p.{citation.pageNumber}</span>
      )}
    </motion.button>
  );
}

// Citation detail panel (slide-over)
function CitationPanel({
  citation, onClose,
}: { citation: Citation | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {citation && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-20"
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="absolute right-0 top-0 bottom-0 w-[340px] z-30 flex flex-col border-l border-white/10 bg-[#0f1117]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Quote className="h-4 w-4 text-[#24A0ED]" />
                <span className="text-sm font-semibold text-white">Source</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-[#24A0ED] flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">{citation.documentTitle}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                      {citation.pageNumber && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" /> Page {citation.pageNumber}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <List className="h-3 w-3" /> Chunk {citation.chunkIndex + 1}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-2">Excerpt</p>
                <blockquote className="border-l-2 border-[#24A0ED]/50 pl-3 text-sm leading-relaxed text-white/70 italic">
                  {citation.snippet}
                  {citation.snippet.length >= 200 && <span className="text-white/30">…</span>}
                </blockquote>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Markdown options — custom components styled for dark theme
const markdownOptions = {
  overrides: {
    h1: { props: { className: 'text-lg font-bold text-white mt-3 mb-1.5' } },
    h2: { props: { className: 'text-base font-semibold text-white mt-3 mb-1' } },
    h3: { props: { className: 'text-sm font-semibold text-white/90 mt-2 mb-0.5' } },
    p:  { props: { className: 'text-sm leading-relaxed text-white/85 mb-2 last:mb-0' } },
    ul: { props: { className: 'list-disc list-inside space-y-1 mb-2 text-sm text-white/85' } },
    ol: { props: { className: 'list-decimal list-inside space-y-1 mb-2 text-sm text-white/85' } },
    li: { props: { className: 'leading-relaxed' } },
    code: { props: { className: 'rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-[#24A0ED]' } },
    pre: { props: { className: 'rounded-lg bg-white/5 border border-white/10 p-3 mb-2 overflow-x-auto text-xs font-mono text-white/80' } },
    strong: { props: { className: 'font-semibold text-white' } },
    em: { props: { className: 'italic text-white/70' } },
    blockquote: { props: { className: 'border-l-2 border-[#24A0ED]/50 pl-3 italic text-white/60 my-2' } },
    hr: { props: { className: 'border-white/10 my-3' } },
    a: { props: { className: 'text-[#24A0ED] underline underline-offset-2 hover:text-[#5bb8f5]', target: '_blank', rel: 'noopener noreferrer' } },
  },
};

// Single message bubble
function MessageBubble({
  msg,
  onCitationClick,
  onCopy,
  copiedId,
}: {
  msg: RagMessage;
  onCitationClick: (c: Citation) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const isUser = msg.role === 'user';
  const isStreaming = !isUser && msg.content === '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full border ${
        isUser
          ? 'border-[#24A0ED]/50 bg-gradient-to-br from-[#24A0ED] to-[#1a7bc4]'
          : 'border-white/10 bg-white/5'
      }`}>
        {isUser
          ? <User className="h-4 w-4 text-white" />
          : <Bot className="h-4 w-4 text-[#24A0ED]" />}
      </div>

      {/* Content */}
      <div className={`max-w-[78%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gradient-to-br from-[#24A0ED] to-[#1a7bc4] text-white rounded-tr-sm shadow-lg shadow-[#24A0ED]/15'
            : 'bg-white/5 border border-white/10 rounded-tl-sm'
        }`}>
          {isStreaming ? (
            <TypingIndicator />
          ) : isUser ? (
            <p className="text-sm leading-relaxed">{msg.content}</p>
          ) : (
            <Markdown options={markdownOptions}>{msg.content}</Markdown>
          )}
        </div>

        {/* Assistant toolbar */}
        {!isUser && msg.content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-1 pl-1"
          >
            <button
              onClick={() => onCopy(msg.content, msg.id)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all"
            >
              {copiedId === msg.id
                ? <><Check className="h-3 w-3 text-green-400" /> <span className="text-green-400">Copied</span></>
                : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </motion.div>
        )}

        {/* Citations */}
        {msg.citations && msg.citations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-1.5 pl-1"
          >
            {msg.citations.slice(0, 6).map((cite, i) => (
              <CitationPill
                key={cite.chunkId}
                citation={cite}
                index={i}
                onClick={() => onCitationClick(cite)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RagChat({ sessionId }: RagChatProps) {
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation history
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setHistoryLoading(true);
    fetch(`${BACKEND_URL}/api/v1/rag/sessions/${sessionId}/messages`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data: { messages?: RagMessage[] }) => setMessages(data.messages ?? []))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput('');
    setLoading(true);

    const userMsg: RagMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', citations: [], createdAt: new Date().toISOString() },
    ]);

    let buffer = '';

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${BACKEND_URL}/api/v1/rag/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmed }),
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
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, citations: event.citations as Citation[] } : m)
            );
          } else if (event.type === 'error') {
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${event.error as string}` } : m)
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error generating response';
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${msg}` } : m)
      );
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  function copyToClipboard(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const isEmpty = !historyLoading && messages.length === 0;

  return (
    <div className="relative flex h-full flex-col bg-[#0a0c12] overflow-hidden">

      {/* ── Message list ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        {historyLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : isEmpty ? (
          /* Empty state with quick-action chips */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full flex-col items-center justify-center gap-6 px-6 py-12 text-center"
          >
            {/* Icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-full bg-[#24A0ED]/20 blur-2xl scale-150" />
              <div className="relative rounded-2xl bg-gradient-to-br from-[#24A0ED]/20 to-[#1a7bc4]/10 border border-[#24A0ED]/20 p-5">
                <BookOpen className="h-10 w-10 text-[#24A0ED]" />
              </div>
            </motion.div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">Ask anything about your documents</h2>
              <p className="text-sm text-white/40 max-w-xs">
                Get instant answers, summaries, and insights — all sourced from your uploaded files.
              </p>
            </div>

            {/* Quick action grid */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {QUICK_ACTIONS.map((action) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void sendMessage(action.prompt)}
                  className="group flex items-start gap-3 rounded-xl border border-white/8 p-3.5 text-left hover:border-white/15 transition-all"
                  style={{ background: action.bg }}
                >
                  <div className="rounded-lg p-1.5 mt-0.5" style={{ background: `${action.color}20` }}>
                    <action.icon className="h-4 w-4" style={{ color: action.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90 group-hover:text-white transition-colors leading-tight">
                      {action.label}
                    </p>
                    <ChevronRight className="h-3 w-3 text-white/20 mt-1 group-hover:text-white/40 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Conversation */
          <div className="space-y-5 p-5 sm:p-6 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onCitationClick={setActiveCitation}
                onCopy={copyToClipboard}
                copiedId={copiedId}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/8 bg-[#0a0c12]/90 backdrop-blur-sm p-4 sm:px-6">
        {/* Quick chips (shown inline when there are messages) */}
        {messages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_ACTIONS.slice(0, 3).map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => void sendMessage(action.prompt)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-white/50 hover:border-white/20 hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <action.icon className="h-3 w-3" />
                {action.label}
              </motion.button>
            ))}
          </div>
        )}

        {/* Text input */}
        <div className="flex items-end gap-3 rounded-xl border border-white/10 bg-white/4 px-4 py-3 focus-within:border-[#24A0ED]/40 focus-within:ring-1 focus-within:ring-[#24A0ED]/20 transition-all">
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your documents… (Enter to send, Shift+Enter for new line)"
            minRows={1}
            maxRows={6}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none disabled:opacity-50 leading-relaxed"
          />
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-[#24A0ED] text-white hover:bg-[#1a7bc4] disabled:opacity-35 disabled:cursor-not-allowed shadow-lg shadow-[#24A0ED]/20 transition-all"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
          </motion.button>
        </div>

        <p className="mt-2 text-center text-xs text-white/20">
          Answers are sourced exclusively from your uploaded documents
        </p>
      </div>

      {/* ── Citation slide-over ───────────────────────────────────────────────── */}
      <CitationPanel citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}
