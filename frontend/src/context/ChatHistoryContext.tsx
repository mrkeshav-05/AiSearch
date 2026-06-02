"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface StoredMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: StoredMessage[];
}

interface ChatHistoryContextValue {
  sessions: ChatSession[];
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  saveSession: (id: string, messages: { id: string; content: string; role: "user" | "assistant"; createdAt: Date }[]) => void;
  deleteSession: (id: string) => void;
  clearAll: () => void;
  getSession: (id: string) => ChatSession | undefined;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

// ── helpers ───────────────────────────────────────────────────────────────────
function getToken(): string | null {
  try { return localStorage.getItem("auth_token"); } catch { return null; }
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function buildTitle(messages: { role: string; content: string }[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  return first.content.length > 50 ? first.content.slice(0, 50).trim() + "…" : first.content;
}

// ── provider ──────────────────────────────────────────────────────────────────
export function ChatHistoryProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // debounce timers per session
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load sessions from API on mount (when token is present)
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${BACKEND_URL}/api/v1/chat/sessions`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!json) return;
        // Sessions from list API don't include messages — store with empty messages
        // We lazy-load messages when a session is selected
        const loaded: ChatSession[] = json.data.sessions.map((s: { id: string; title: string; created_at: string }) => ({
          id: s.id,
          title: s.title,
          createdAt: s.created_at,
          messages: [],
        }));
        setSessions(loaded);
      })
      .catch(() => {/* offline – no history shown */});
  }, []);

  const saveSession = useCallback(
    (id: string, messages: { id: string; content: string; role: "user" | "assistant"; createdAt: Date }[]) => {
      if (messages.length === 0) return;
      const title = buildTitle(messages);
      const stored: StoredMessage[] = messages.map((m) => ({
        id: m.id,
        content: m.content,
        role: m.role,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      }));

      // Update local state immediately
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === id);
        if (existing) {
          return prev.map((s) => s.id === id ? { ...s, title, messages: stored } : s);
        }
        const newSession: ChatSession = { id, title, createdAt: new Date().toISOString(), messages: stored };
        return [newSession, ...prev].slice(0, 50);
      });

      // Debounce API sync (300 ms) to avoid hammering on every keypress
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(async () => {
        const token = getToken();
        if (!token) return;
        try {
          await fetch(`${BACKEND_URL}/api/v1/chat/sessions/${id}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ title, messages: stored }),
          });
        } catch { /* offline – skip */ }
      }, 300);
    },
    []
  );

  const deleteSession = useCallback(async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${BACKEND_URL}/api/v1/chat/sessions/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch { /* offline */ }
  }, []);

  const clearAll = useCallback(async () => {
    setSessions([]);
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`${BACKEND_URL}/api/v1/chat/sessions`, {
        method: "DELETE",
        headers: authHeaders(),
      });
    } catch { /* offline */ }
  }, []);

  // Lazy-load messages for a session that only has metadata
  const getSession = useCallback(
    (id: string): ChatSession | undefined => {
      const session = sessions.find((s) => s.id === id);
      if (!session) return undefined;

      // If messages already loaded, return immediately
      if (session.messages.length > 0) return session;

      // Fetch messages in background and update state
      const token = getToken();
      if (token) {
        fetch(`${BACKEND_URL}/api/v1/chat/sessions/${id}`, { headers: authHeaders() })
          .then((r) => r.ok ? r.json() : null)
          .then((json) => {
            if (!json) return;
            const msgs: StoredMessage[] = json.data.messages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              createdAt: m.created_at,
            }));
            setSessions((prev) =>
              prev.map((s) => s.id === id ? { ...s, messages: msgs } : s)
            );
          })
          .catch(() => {});
      }

      // Return session with empty messages — caller will re-render when state updates
      return session;
    },
    [sessions]
  );

  return (
    <ChatHistoryContext.Provider value={{ sessions, currentSessionId, setCurrentSessionId, saveSession, deleteSession, clearAll, getSession }}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory(): ChatHistoryContextValue {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) throw new Error("useChatHistory must be used inside <ChatHistoryProvider>");
  return ctx;
}
