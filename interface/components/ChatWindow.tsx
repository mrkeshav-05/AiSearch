"use client";

import { Document } from "@langchain/core/documents";
import { useEffect, useState } from "react";

export type Message = {
  id: string;
  createdAt?: Date;
  content: string;
  role: "user" | "assistant";
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
  const [loading, setloading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const sendMessage = (message: string) => {
    if (loading) return;

    setloading(true);
    setMessageAppeared(false);

    let sources: Document[] | undefined = undefined;
    let receivedMessage: "";
    let added = false;

    ws?.send(
      JSON.stringify({
        type: "message",
        message: message,
        history: [...chatHistory, ["human", message]],
      })
    );

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: message,
        id: Math.random().toString(36).substring(7),
        role: "user",
      },
    ]);
    const messageHandler = (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (data.type === "sources") {
        sources = data.sources;

        if (!added) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: "",
              id: data.messageId,
              role: "assistant",
              sources: sources,
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
        receivedMessage = data.data;
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
      }
    };
    ws?.addEventListener("message", messageHandler);
  };
  return <div>{messages.length > 0 ? <></> : <></>}</div>;
};

export default ChatWindow;
