"use client";

import { Document } from "@langchain/core/documents";
import { useEffect, useRef, useState } from "react";
import EmptyChat from "./EmptyChat";
import Chat from "./Chat";
import { getSuggestions } from "@/lib/actions";
import Navbar from "./Navbar";
export type Message = {
  id: string;
  createdAt: Date;
  content: string;
  role: "user" | "assistant";
  suggestions?: string[];
  sources?: Document[];
};

// We have created a hook custom hoook to connect to the websocket
// This hook will return the websocket object
// We are using the useState hook to store the websocket object
const useSocket = (url: string) => {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!ws) {
      const ws = new WebSocket(url);
      ws.onopen = () => {
        console.log("[DEBUG] open");
        setWs(ws);
      };
    }

    return () => {
      ws?.close();
    };
  }, [ws, url]);

  return ws;
};

// In this component, we are connecting to the websocket and sending messages
const ChatWindow = () => {
  const ws = useSocket(process.env.NEXT_PUBLIC_WS_URL!);
  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const [loading, setloading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);
  const [focusMode, setFocusMode] = useState("webSearch");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
    // console.log(messages)
  }, [messages]);

  const sendMessage = (message: string) => {
    if (loading) return;

    setloading(true);
    setMessageAppeared(false);

    let sources: Document[] | undefined = undefined;
    let receivedMessage: string = "";
    let added = false;

    ws?.send(
      JSON.stringify({
        type: "message",
        message: message,
        focusMode: focusMode,
        history: [...chatHistory, ["human", message]],
      })
    );
    console.log("Sent message to server");
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
              createdAt: new Date(),
            },
          ]);
          added = true;
        }
        setMessages((prev) =>
          prev.map((message) => {
            if (message.id == data.messageId) {
              return {
                ...message,
                content: message.content + data.data,
              };
            }
            return message;
          })
        );
        receivedMessage += data.data;
        setMessageAppeared(true);
      }
      if (data.type === "messageEnd") {
        setChatHistory((prevHistory) => [
          ...prevHistory,
          ["human", message],
          ["assistant", receivedMessage],
        ]);
        ws?.removeEventListener("message", messageHandler);
        setloading(false);

        // Fetch suggestions for the last assistant message
        const lastMsg = messagesRef.current[messagesRef.current.length - 1];

        if (lastMsg.role === "assistant" && !lastMsg.suggestions) {
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
    if(index === -1) return;
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
        />
      )}
    </div>
  );
};

export default ChatWindow;
