'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Bot, User, Loader2, BookOpen } from 'lucide-react';
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-light-400 dark:text-dark-400 py-16">
            <BookOpen className="h-10 w-10 opacity-40" />
            <p className="text-sm">Ask a question about the selected documents</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full
              ${msg.role === 'user'
                ? 'bg-[#24A0ED]/15 text-[#24A0ED]'
                : 'bg-light-100 dark:bg-dark-100 text-light-400 dark:text-dark-400'
              }`}>
              {msg.role === 'user'
                ? <User className="h-4 w-4" />
                : <Bot className="h-4 w-4" />
              }
            </div>

            <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-[#24A0ED] text-white rounded-tr-sm'
                  : 'bg-light-secondary dark:bg-dark-secondary text-black dark:text-white rounded-tl-sm'
                }`}>
                {msg.content || <Loader2 className="h-4 w-4 animate-spin text-light-400" />}
              </div>

              {/* Citations */}
              {msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.citations.slice(0, 5).map((cite, i) => (
                    <button
                      key={cite.chunkId}
                      onClick={() => setActiveCitation(cite)}
                      className="inline-flex items-center gap-1 rounded-full border border-light-200 dark:border-dark-200 bg-light-100 dark:bg-dark-100 px-2 py-0.5 text-xs text-light-400 dark:text-dark-400 hover:border-[#24A0ED]/50 hover:text-[#24A0ED] transition-colors"
                    >
                      <span className="font-semibold">[{i + 1}]</span>
                      <span className="max-w-[120px] truncate">{cite.documentTitle}</span>
                      {cite.pageNumber && <span>p.{cite.pageNumber}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-light-200 dark:border-dark-200 p-4">
        <div className="flex items-end gap-2 rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-black dark:text-white placeholder:text-light-400 dark:placeholder:text-dark-400 focus:outline-none disabled:opacity-50"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 flex items-center justify-center rounded-lg p-1.5 text-[#24A0ED] hover:bg-[#24A0ED]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-light-400 dark:text-dark-400">
          Answers are based on the selected documents only.
        </p>
      </div>

      {/* Citation modal */}
      {activeCitation && (
        <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
      )}
    </div>
  );
}
