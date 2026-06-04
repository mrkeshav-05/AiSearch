"use client";

import { Document } from "@langchain/core/documents";
import { useEffect, useRef, useState } from "react";
import EmptyChat from "./EmptyChat";
import Chat from "./Chat";
import { getSuggestions } from "@/lib/actions";
import Navbar from "../layout/Navbar";
import { useChatHistory } from "@/context/ChatHistoryContext";
import { useChatSession } from "@/context/ChatSessionContext";
import { useAuth } from "@/context/AuthContext";
import { type AIStatus } from "./AIStatusBadge";

export type Message = {
  id: string;
  createdAt: Date;
  content: string;
  role: "user" | "assistant";
  suggestions?: string[];
  sources?: Document[];
  aiStatus?: AIStatus;
};

// WebSocket hook
const useSocket = (url: string) => {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!ws) {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        console.log("[WS] Connected to backend");
        setWs(ws);
      };
      ws.onerror = (err) => console.error("[WS] Connection error:", err);
    }
    return () => {
      ws?.close();
    };
  }, [ws, url]);

  return ws;
};

const ChatWindow = () => {
  const ws = useSocket(process.env.NEXT_PUBLIC_WS_URL!);
  const { saveSession, setCurrentSessionId } = useChatHistory();
  const { activeSession, sessionKey } = useChatSession();
  const { user } = useAuth();

  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [loading, setloading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);
  const [focusMode, setFocusMode] = useState("webSearch");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // When sessionKey changes, reset state
  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    if (activeSession) {
      sessionIdRef.current = activeSession.id;
      const restored: Message[] = activeSession.messages.map((m) => ({
        id: m.id,
        content: m.content,
        role: m.role,
        createdAt: new Date(m.createdAt),
      }));
      const restoredHistory: [string, string][] = [];
      for (let i = 0; i < restored.length - 1; i += 2) {
        if (restored[i].role === "user" && restored[i + 1]?.role === "assistant") {
          restoredHistory.push(["human", restored[i].content], ["assistant", restored[i + 1].content]);
        }
      }
      setMessages(restored);
      setChatHistory(restoredHistory);
    } else {
      setMessages([]);
      setChatHistory([]);
    }
    setCurrentSessionId(sessionIdRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  // Persist messages to history on every change
  useEffect(() => {
    messagesRef.current = messages;
    if (messages.length > 0) {
      saveSession(sessionIdRef.current, messages.map((m) => ({
        id: m.id,
        content: m.content,
        role: m.role,
        createdAt: m.createdAt,
      })));
    }
  }, [messages, saveSession]);

  const sendMessage = (message: string) => {
    if (loading) return;

    setloading(true);
    setMessageAppeared(false);

    let sources: Document[] | undefined = undefined;
    let receivedMessage: string = "";
    let added = false;
    let currentAiStatus: AIStatus | undefined = undefined;

    ws?.send(
      JSON.stringify({
        type: "message",
        message: message,
        focusMode: focusMode,
        history: [...chatHistory, ["human", message]],
      })
    );

    console.log("[WS] Sent message:", message);

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: message,
        id: Math.random().toString(36).substring(7),
        role: "user",
        createdAt: new Date(),
      },
    ]);

    const messageHandler = async (e: MessageEvent) => {
      const data = JSON.parse(e.data);

      // Handle provider status updates
      if (data.type === "aiStatus") {
        console.log("[WS] AI Status:", data.status, "| Provider:", data.provider, "| Model:", data.model);
        currentAiStatus = {
          status: data.status,
          provider: data.provider,
          model: data.model,
          reason: data.reason,
        };
        // Update the last assistant message's status if it exists
        setMessages((prev) => {
          const lastAssistant = [...prev].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) {
            return prev.map((m) => m.id === lastAssistant.id ? { ...m, aiStatus: currentAiStatus } : m);
          }
          return prev;
        });
        return;
      }

      if (data.type === "sources") {
        sources = data.data;
        if (!added) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: "",
              id: data.messageId,
              role: "assistant",
              sources: sources,
              aiStatus: currentAiStatus,
              createdAt: new Date(),
            },
          ]);
          added = true;
        }
        setMessageAppeared(true);
      }

      if (data.type === "message") {
        if (!added) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: data.data,
              id: data.messageId,
              role: "assistant",
              sources: sources,
              aiStatus: currentAiStatus,
              createdAt: new Date(),
            },
          ]);
          added = true;
        }
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id == data.messageId) {
              return { ...message, content: message.content + data.data };
            }
            return message;
          })
        );
        receivedMessage += data.data;
        setMessageAppeared(true);
      }

      if (data.type === "messageEnd") {
        // Prevent huge fallback text (search snippets) from polluting the chat history context
        const isFallback = currentAiStatus?.status === "rate_limited" || currentAiStatus?.status === "no_credits";
        const historyMessage = isFallback 
          ? "[Search results provided directly to user due to AI limits]" 
          : receivedMessage;

        setChatHistory((prevHistory) => [
          ...prevHistory,
          ["human", message],
          ["assistant", historyMessage],
        ]);
        ws?.removeEventListener("message", messageHandler);
        setloading(false);

        // Mark final AI status as done
        const finalStatus: AIStatus = {
          ...currentAiStatus,
          status: currentAiStatus?.status === "rate_limited" ? "rate_limited" : "done",
          provider: currentAiStatus?.provider,
          model: currentAiStatus?.model,
        };
        setMessages((prev) => {
          const lastAssistant = [...prev].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) {
            return prev.map((m) => m.id === lastAssistant.id ? { ...m, aiStatus: finalStatus } : m);
          }
          return prev;
        });

        // Fetch suggestions for the last assistant message
        const lastMsg = messagesRef.current[messagesRef.current.length - 1];
        if (lastMsg.role === "assistant" && !lastMsg.suggestions && receivedMessage.length > 0) {
          setSuggestionsLoading(true);
          try {
            const suggestions = await getSuggestions(messagesRef.current);
            if (suggestions.length > 0) {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id === lastMsg.id) {
                    return { ...msg, suggestions: suggestions };
                  }
                  return msg;
                })
              );
            }
          } catch (error) {
            console.error("Failed to fetch suggestions:", error);
          } finally {
            setSuggestionsLoading(false);
          }
        }
      }
    };

    ws?.addEventListener("message", messageHandler);
  };

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.id === messageId);
    if (index === -1) return;
    const message = messages[index - 1];
    setMessages((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });
    setChatHistory((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });
    sendMessage(message.content);
  };

  return (
    <div>
      {messages.length > 0 ? (
        <>
          <Navbar messages={messages} />
          <Chat
            messages={messages}
            sendMessage={sendMessage}
            loading={loading}
            messageAppeared={messageAppeared}
            rewrite={rewrite}
            suggestionsLoading={suggestionsLoading}
          />
        </>
      ) : (
        <EmptyChat
          sendMessage={sendMessage}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          userName={user?.name}
        />
      )}
    </div>
  );
};

export default ChatWindow;
