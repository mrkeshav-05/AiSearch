"use client";

import Sidebar from "./Sidebar";
import { useChatSession } from "@/context/ChatSessionContext";
import { useChatHistory } from "@/context/ChatHistoryContext";
import { useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function getToken(): string | null {
  try { return localStorage.getItem("auth_token"); } catch { return null; }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { startNewChat, loadSession } = useChatSession();
  const { sessions } = useChatHistory();

  const handleSelectSession = async (id: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/chat/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const session = {
        id: json.data.session.id,
        title: json.data.session.title,
        createdAt: json.data.session.created_at,
        messages: json.data.messages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.created_at,
        })),
      };
      loadSession(session);
    } catch { /* offline */ }
  };

  return (
    <Sidebar onNewChat={startNewChat} onSelectSession={handleSelectSession}>
      {children}
    </Sidebar>
  );
}
