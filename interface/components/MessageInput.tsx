// Message Input Component
// Handles user message input with adaptive UI and keyboard shortcuts
// Provides single-line and multi-line input modes with smooth transitions

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Attach, CopilotToggle } from "./MessageInputActions";
import { ArrowUp } from "lucide-react";

/**
 * Adaptive message input component for user queries
 * 
 * @param sendMessage - Function to send user message via WebSocket
 * @param loading - Boolean indicating if AI is currently processing
 * 
 * Features:
 * - Auto-resizing textarea that grows with content
 * - Adaptive UI: single-line (pill) vs multi-line (rounded) layout
 * - Keyboard shortcuts: Enter to send, Shift+Enter for new line
 * - Visual feedback for loading states
 * - Copilot integration toggle (future feature)
 * - File attachment support (future feature)
 * 
 * State Management:
 * - message: Current input text
 * - textareaRows: Number of rows for auto-sizing
 * - mode: UI layout mode based on content size
 * - copilotEnabled: Toggle for AI assistance features
 * 
 * UI Modes:
 * - single: Horizontal pill layout for short messages
 * - multi: Vertical rounded layout for longer messages
 */
const MessageInput = ({
  sendMessage,
  loading,
}: {
  sendMessage: (message: string) => void;
  loading: boolean;
}) => {
  const [copilotEnabled, setCopilotEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [textareaRows, setTextareaRows] = useState(1);

  // UI mode state: adapts layout based on message length
  const [mode, setMode] = useState<"multi" | "single">("single");

  useEffect(() => {
    if (textareaRows >= 2 && message && mode === "single") {
      setMode("multi");
    } else if (!message && mode === "multi") {
      setMode("single");
    }
  }, [textareaRows, mode, message]);

  return (
    <form
      onSubmit={(e) => {
        if (loading) return;
        e.preventDefault();
        sendMessage(message);
        setMessage("");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !loading) {
          e.preventDefault();
          sendMessage(message);
          setMessage("");
        }
      }}
      className={cn(
        "bg-[#111111] p-4 flex items-center overflow-hidden border border-[#1C1C1C]",
        mode === "multi" ? "flex-col rounded-lg" : "flex-row rounded-full"
      )}
    >
      {mode === "single" && <Attach />}
      <TextareaAutosize
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onHeightChange={(height, props) => {
          setTextareaRows(Math.ceil(height / props.rowHeight));
        }}
        className="transition bg-transparent text-[#24A0ED] caret-[#24A0ED] placeholder:text-[#20648e] placeholder:text-sm text-sm  resize-none focus:outline-none w-full max-h-24 lg:max-h-36 xl:max-h-48 flex-grow flex-shrink"
        placeholder="Ask a follow up"
      />
      {mode === "single" && (
        <div className="flex flex-row items-center space-x-4">
          <CopilotToggle
            copilotEnabled={copilotEnabled}
            setCopilotEnabled={setCopilotEnabled}
          />
          <button
            disabled={message.trim().length === 0 || loading}
            className="bg-[#24A0ED] text-white disabled:text-white/50 hover:bg-opacity-85 transition duration-100 disabled:bg-[#ececec21] rounded-full p-2"
          >
            <ArrowUp size={17} />
          </button>
        </div>
      )}
      {mode === "multi" && (
        <div className="flex flex-row items-center justify-between w-full pt-2">
          <Attach />
          <div className="flex flex-row items-center space-x-4">
            <CopilotToggle
              copilotEnabled={copilotEnabled}
              setCopilotEnabled={setCopilotEnabled}
            />
            <button
              disabled={message.trim().length === 0 || loading}
              className="bg-[#24A0ED] text-white disabled:text-white/50 hover:bg-opacity-85 hover:text-[#24A0ED] transition duration-100 disabled:bg-[#ececec21] rounded-full p-2"
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default MessageInput;