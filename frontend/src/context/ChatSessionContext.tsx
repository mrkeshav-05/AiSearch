"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ChatSession } from "./ChatHistoryContext";

interface ChatSessionContextValue {
  activeSession: ChatSession | null;
  sessionKey: number; // increment to force ChatWindow remount (new chat)
  loadSession: (session: ChatSession) => void;
  startNewChat: () => void;
}

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const loadSession = useCallback((session: ChatSession) => {
    setActiveSession(session);
    setSessionKey((k) => k + 1);
  }, []);

  const startNewChat = useCallback(() => {
    setActiveSession(null);
    setSessionKey((k) => k + 1);
  }, []);

  return (
    <ChatSessionContext.Provider value={{ activeSession, sessionKey, loadSession, startNewChat }}>
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSession(): ChatSessionContextValue {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) throw new Error("useChatSession must be used inside <ChatSessionProvider>");
  return ctx;
}
