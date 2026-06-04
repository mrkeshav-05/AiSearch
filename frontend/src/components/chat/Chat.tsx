"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "./ChatWindow";
import MessageBox from "./MessageBox";
import MessageBoxLoading from "./MessageBoxLoading";
import MessageInput from "./MessageInput";

const Chat = ({
  loading,
  messageAppeared,
  rewrite,
  sendMessage,
  messages,
  suggestionsLoading,
}: {
  messages: Message[];
  sendMessage: (message: string) => void;
  loading: boolean;
  messageAppeared: boolean;
  rewrite: (messageId: string) => void;
  suggestionsLoading: boolean;
}) => {
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const messageEnd = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const [inputWidth, setInputWidth] = useState(0);

  // Measure the chat container for fixed input bar
  useEffect(() => {
    const updateWidth = () => {
      if (dividerRef.current) {
        setInputWidth(dividerRef.current.scrollWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (dividerRef.current) observer.observe(dividerRef.current);
    window.addEventListener("resize", updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  });

  const isAtBottom = useRef(true);

  // Track if user is at bottom of viewport
  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      // 150px tolerance
      isAtBottom.current = scrollHeight - scrollTop - clientHeight < 150;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smart auto-scroll
  useEffect(() => {
    // Always force scroll when a new user message is sent
    const isNewUserMessage = messages.length > 0 && messages[messages.length - 1].role === "user";
    
    if (isNewUserMessage) {
      isAtBottom.current = true;
      messageEnd.current?.scrollIntoView({ behavior: "smooth" });
    } else if (isAtBottom.current) {
      // Use 'auto' behavior during streaming to prevent jittery/shaky UI
      messageEnd.current?.scrollIntoView({ behavior: "auto" });
    }

    if (messages.length === 1) {
      document.title = `${messages[0].content.substring(0, 40)} — AiSearch`;
    }
  }, [messages]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Message feed */}
      <div className="flex flex-col gap-8 pt-6 pb-64 px-4 sm:px-6 md:px-10 max-w-6xl mx-auto w-full">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          return (
            <div key={i}>
              <MessageBox
                message={msg}
                history={messages}
                loading={loading}
                dividerRef={isLast ? dividerRef : undefined}
                isLast={isLast}
                rewrite={rewrite}
                messageIndex={i}
                sendMessage={sendMessage}
                suggestionsLoading={suggestionsLoading}
              />
              {/* Divider between Q&A pairs */}
              {!isLast && msg.role === "assistant" && (
                <div className="section-divider mt-8" />
              )}
            </div>
          );
        })}

        {/* Loading skeleton */}
        {loading && !messageAppeared && (
          <div className="animate-fade-in">
            <MessageBoxLoading />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messageEnd} className="h-0" />
      </div>

      {/* Sticky input bar */}
      {inputWidth > 0 && (
        <div
          ref={inputRef}
          className="fixed bottom-0 z-50"
          style={{ width: inputWidth }}
        >
          <MessageInput sendMessage={sendMessage} loading={loading} />
        </div>
      )}
    </div>
  );
};

export default Chat;
