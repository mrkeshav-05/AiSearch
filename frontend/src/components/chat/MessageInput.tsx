"use client";

import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, Paperclip, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const MessageInput = ({
  sendMessage,
  loading,
}: {
  sendMessage: (message: string) => void;
  loading: boolean;
}) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!message.trim() || loading) return;
    sendMessage(message.trim());
    setMessage("");
  };

  return (
    <div className="sticky-input px-4 pb-4 pt-6">
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        className={cn(
          "input-container flex items-end gap-3 px-4 py-3 transition-all duration-200",
          isFocused ? "shadow-[0_0_0_3px_rgba(59,130,246,0.08)]" : ""
        )}
      >
        {/* Attach button */}
        <button
          type="button"
          className="flex-shrink-0 mb-0.5 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Attach file"
        >
          <Paperclip size={16} />
        </button>

        {/* Textarea */}
        <TextareaAutosize
          ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask a follow-up…"
          maxRows={6}
          className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm resize-none focus:outline-none leading-relaxed py-0.5"
        />

        {/* AI indicator + Send */}
        <div className="flex items-center gap-2 flex-shrink-0 mb-0.5">
          {loading && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--surface-3)]">
              <Sparkles size={12} className="text-blue-400 animate-pulse" />
              <span className="text-[10px] text-[var(--text-muted)]">Thinking…</span>
            </div>
          )}
          <button
            type="submit"
            disabled={!message.trim() || loading}
            className={cn(
              "p-2 rounded-xl transition-all duration-200",
              message.trim() && !loading
                ? "bg-blue-500 text-white hover:bg-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.35)] scale-100 hover:scale-105"
                : "bg-[var(--surface-3)] text-[var(--text-muted)] cursor-not-allowed"
            )}
            aria-label="Send"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </form>

      {/* Hint */}
      <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
        Press <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[9px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] text-[9px] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
};

export default MessageInput;