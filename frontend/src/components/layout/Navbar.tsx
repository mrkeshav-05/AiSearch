"use client";

import { useEffect, useState } from "react";
import { Message } from "@/components/chat/ChatWindow";
import { formatTimeDifference } from "@/lib/utils";
import { Clock, PenLine, Share2, Sparkles } from "lucide-react";

const Navbar = ({ messages }: { messages: Message[] }) => {
  const [title, setTitle] = useState("");
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (messages.length > 0) {
      const raw = messages[0].content;
      setTitle(raw.length > 40 ? `${raw.substring(0, 40).trim()}…` : raw);
      setTimeAgo(formatTimeDifference(new Date(), messages[0].createdAt!));
    }
  }, [messages]);

  useEffect(() => {
    const id = setInterval(() => {
      if (messages.length > 0) {
        setTimeAgo(formatTimeDifference(new Date(), messages[0].createdAt));
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 glass border-b border-[var(--glass-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:pl-[104px] flex items-center justify-between h-14">
        {/* Left: brand / edit on mobile */}
        <div className="flex items-center gap-3">
          {/* Mobile edit */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <PenLine size={16} />
          </button>

          {/* Desktop: brand mark */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              AiSearch
            </span>
          </div>
        </div>

        {/* Center: title */}
        <div className="hidden lg:flex items-center gap-2 max-w-md">
          <p className="text-sm text-[var(--text-secondary)] truncate font-medium">
            {title}
          </p>
        </div>

        {/* Right: meta + actions */}
        <div className="flex items-center gap-3">
          {timeAgo && (
            <div className="hidden lg:flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
              <Clock size={12} />
              <span>{timeAgo} ago</span>
            </div>
          )}
          <button className="p-2 rounded-lg hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <Share2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;