// Chat Component - Main conversation interface
// Displays message history and handles user interactions in active chat sessions
// Manages message rendering, auto-scrolling, and loading states

"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "./ChatWindow";
import MessageBox from "./MessageBox";
import MessageBoxLoading from "./MessageBoxLoading";
import MessageInput from "./MessageInput";

/**
 * Main chat interface component for active conversations
 * 
 * @param messages - Array of conversation messages (user and AI)
 * @param sendMessage - Function to send new message via WebSocket
 * @param loading - Boolean indicating if AI is processing
 * @param messageAppeared - Boolean indicating if new message started appearing
 * @param rewrite - Function to regenerate AI response for a message
 * 
 * Features:
 * - Message history display with scrolling
 * - Auto-scroll to newest messages
 * - Loading indicators during AI processing
 * - Message rewrite functionality
 * - Responsive layout with proper spacing
 * - Dynamic divider width calculation
 * 
 * State Management:
 * - dividerWidth: Width of message divider for consistent spacing
 * - dividerRef: Reference for measuring divider dimensions
 * - messageEnd: Reference for auto-scrolling to latest message
 * 
 * Layout Structure:
 * - Message history container (scrollable)
 * - Individual MessageBox components for each message
 * - Loading indicator for pending AI responses
 * - Fixed message input at bottom
 */
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
  // State for dynamic UI measurements
  const [dividerWidth, setDividerWidth] = useState(0);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const messageEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateDividerWidth = () => {
      if (dividerRef.current) {
        setDividerWidth(dividerRef.current.scrollWidth);
      }
    };
    updateDividerWidth();
    window.addEventListener("resize", updateDividerWidth);
    return () => {
      window.removeEventListener("resize", updateDividerWidth);
    };
  });

  useEffect(() => {
    messageEnd.current?.scrollIntoView({ behavior: "smooth" });

    if (messages.length === 1) {
      document.title = `${messages[0].content.substring(0, 30)} - AiSearch`;
    }
  }, [messages]);
  return (
    <div className="flex flex-col space-y-6 pt-8 pb-44 lg:pb-32 sm:mx-4 md:mx-8">
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
            {!isLast && msg.role === "assistant" && (
              <div className="h-px w-full bg-[#1C1C1C]" />
            )}
          </div>
        );
      })}
      {loading && !messageAppeared && <MessageBoxLoading />}
      <div ref={messageEnd} className="h-0" />
      {dividerWidth > 0 && (
        <div
          className={`bottom-24 lg:bottom-0 fixed z-40`}
          style={{ width: dividerWidth }}
        >
          <MessageInput sendMessage={sendMessage} loading={loading} />
        </div>
      )}
    </div>
  );
};

export default Chat;
