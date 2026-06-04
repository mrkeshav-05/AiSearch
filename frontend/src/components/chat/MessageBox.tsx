"use client";

import { MutableRefObject, useEffect, useState } from "react";
import { Message } from "./ChatWindow";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Sparkles,
  Share2,
  RotateCcw,
  Copy as CopyIcon,
  Volume2,
  VolumeX,
  ChevronRight,
  Layers,
  Zap,
  ImageIcon,
  VideoIcon,
} from "lucide-react";
import MessageSources from "./MessageSources";
import Markdown from "markdown-to-jsx";
import Rewrite from "../MessageActions/Rewrite";
import SearchImages from "../search/SearchImages";
import SearchVideos from "../search/SearchVideos";
import { useSpeech } from "react-text-to-speech";
import AIStatusBadge from "./AIStatusBadge";
import SearchOnlyBanner from "./SearchOnlyBanner";

const MessageBox = ({
  message,
  messageIndex,
  history,
  loading,
  dividerRef,
  isLast,
  rewrite,
  sendMessage,
  suggestionsLoading,
}: {
  message: Message;
  messageIndex: number;
  history: Message[];
  loading: boolean;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
  rewrite: (messageId: string) => void;
  sendMessage: (message: string) => void;
  suggestionsLoading: boolean;
}) => {
  const [parsedMessage, setParsedMessage] = useState(message.content);
  const [speechMessage, setSpeechMessage] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showVideos, setShowVideos] = useState(false);
  const isFallbackMode = message.aiStatus?.status === "rate_limited" || message.aiStatus?.status === "no_credits";
  const isNoCredits = message.aiStatus?.status === "no_credits";
  // isSearchOnly: true only when there is genuinely no text content
  // (fallback now emits a summary text, so even rate-limited results have content)
  const isSearchOnly = !message.content;

  useEffect(() => {
    if (
      message.role === "assistant" &&
      message?.sources &&
      message.sources.length > 0
    ) {
      const regex = /\[(\d+)\]/g;
      setSpeechMessage(message.content.replace(regex, ""));

      const processed = message.content.replace(regex, (_, num) => {
        const idx = parseInt(num) - 1;
        if (message.sources?.[idx]?.metadata?.url) {
          return `[[${num}]](${message.sources[idx].metadata.url})`;
        }
        return `[${num}]`;
      });

      setParsedMessage(processed);
      return;
    }
    setParsedMessage(message.content);
  }, [message]);

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  const handleCopyClick = () => {
    navigator.clipboard.writeText(message.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const query = history[messageIndex - 1]?.content ?? "";

  return (
    <>
      {/* ─── User message ─────────────────────────────────────── */}
      {message.role === "user" && (
        <div
          className={cn(
            "animate-fade-in-up",
            messageIndex === 0 ? "pt-16" : "pt-10"
          )}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] leading-snug tracking-tight">
            {message.content}
          </h2>
        </div>
      )}

      {/* ─── Assistant message ────────────────────────────────── */}
      {message.role === "assistant" && (
        <div className="flex flex-col gap-6 animate-fade-in-up">

          {/* ── Sources section (full width, above answer) ── */}
          {message.sources && message.sources.length > 0 && (
            <div className="flex flex-col gap-3 animate-fade-in-up">
              <div className="flex items-center gap-2">
                <BookOpen size={13} className="text-[var(--text-muted)]" />
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Sources
                </span>
                <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-3)] px-1.5 py-0.5 rounded-full">
                  {message.sources.length}
                </span>
              </div>
              <MessageSources sources={message.sources} />
            </div>
          )}

          {/* ── Two-column layout: main answer + sidebar ── */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Main answer column */}
            <div
              ref={dividerRef ?? undefined}
              className="flex flex-col gap-5 w-full lg:w-[67%] xl:w-[68%]"
            >
              {/* Search-only banner (when AI is rate limited) */}
              {isSearchOnly && message.sources && message.sources.length > 0 && (
                <SearchOnlyBanner provider={message.aiStatus?.provider} />
              )}

              {/* AI Answer card — only show when there's content */}
              {!isSearchOnly && (
                <div className="ai-answer-card rounded-2xl overflow-hidden">
                  {/* Card header */}
                  <div className="px-5 pt-4 pb-3 border-b border-[var(--glass-border)] flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                      <Sparkles
                        size={14}
                        className={cn(
                          isFallbackMode ? "text-amber-400" : "text-blue-400",
                          isLast && loading ? "animate-pulse" : ""
                        )}
                      />
                    </div>
                    <span className="ai-summary-label">
                      {isFallbackMode 
                        ? (isNoCredits ? "Search Results (No Active Credits)" : "Search Results (AI Quota Exceeded)") 
                        : "AI Generated Summary"}
                    </span>
                    {isLast && loading && (
                      <div className="ml-auto flex items-center gap-1">
                        <span className="typing-dot" style={{ animationDelay: "0ms" }} />
                        <span className="typing-dot" style={{ animationDelay: "160ms" }} />
                        <span className="typing-dot" style={{ animationDelay: "320ms" }} />
                      </div>
                    )}
                    {/* AI status badge */}
                    {message.aiStatus && !loading && (
                      <div className="ml-auto">
                        <AIStatusBadge aiStatus={message.aiStatus} />
                      </div>
                    )}
                  </div>

                  {/* Answer body */}
                  <div className="px-6 py-5">
                    <Markdown
                      className="ai-prose"
                      options={{
                        overrides: {
                          a: {
                            component: ({ children, href, ...props }: { children: React.ReactNode; href?: string; [key: string]: unknown }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="citation-badge"
                                {...props}
                              >
                                {children}
                              </a>
                            ),
                          },
                        },
                      }}
                    >
                      {parsedMessage}
                    </Markdown>
                  </div>

                  {/* Action bar */}
                  {!loading && (
                    <div className="px-5 pb-4 pt-1 border-t border-[var(--glass-border)] flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] rounded-lg text-xs transition-all duration-200"
                          aria-label="Share"
                        >
                          <Share2 size={13} />
                          <span>Share</span>
                        </button>
                        <Rewrite rewrite={rewrite} messageId={message.id} />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleCopyClick}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] rounded-lg text-xs transition-all duration-200"
                          aria-label="Copy"
                        >
                          <CopyIcon size={13} />
                          <span>{copied ? "Copied!" : "Copy"}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (speechStatus === "started") stop();
                            else start();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] rounded-lg text-xs transition-all duration-200"
                          aria-label="Listen"
                        >
                          {speechStatus === "started" ? (
                            <VolumeX size={13} />
                          ) : (
                            <Volume2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Follow-up suggestions (related searches as chips) */}
              {isLast && message.role === "assistant" && !loading && (
                <>
                  {(message.suggestions || suggestionsLoading) && (
                    <div className="flex flex-col gap-3 animate-fade-in-up">
                      <div className="section-divider" />
                      <div className="flex items-center gap-2">
                        <Layers size={13} className="text-[var(--text-muted)]" />
                        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                          Related Searches
                        </span>
                        {suggestionsLoading && (
                          <Zap size={12} className="text-blue-400 animate-pulse ml-1" />
                        )}
                      </div>

                      {suggestionsLoading ? (
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-8 w-40 rounded-full skeleton" />
                          ))}
                        </div>
                      ) : (
                        message.suggestions &&
                        message.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, i) => (
                              <button
                                key={i}
                                onClick={() => sendMessage(suggestion)}
                                className="suggestion-chip animate-fade-in-up"
                                style={{ animationDelay: `${i * 60}ms` }}
                              >
                                <ChevronRight size={11} className="flex-shrink-0 text-blue-400/70" />
                                <span>{suggestion}</span>
                              </button>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Right sidebar: images + videos ── */}
            <div className="lg:sticky lg:top-20 flex flex-col gap-4 w-full lg:w-[33%] xl:w-[32%] h-fit pb-4">
              {/* Quick toggle buttons for images/videos */}
              {!showImages && !showVideos && query && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImages(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[var(--glass-border)] hover:border-blue-500/30 hover:bg-blue-500/5 text-[var(--text-muted)] hover:text-blue-400 text-xs transition-all duration-200"
                  >
                    <ImageIcon size={13} />
                    <span>Images</span>
                  </button>
                  <button
                    onClick={() => setShowVideos(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[var(--glass-border)] hover:border-purple-500/30 hover:bg-purple-500/5 text-[var(--text-muted)] hover:text-purple-400 text-xs transition-all duration-200"
                  >
                    <VideoIcon size={13} />
                    <span>Videos</span>
                  </button>
                </div>
              )}

              {showImages && (
                <SearchImages
                  query={query}
                  chat_history={history.slice(0, messageIndex - 1)}
                  autoFetch={true}
                />
              )}
              {showVideos && (
                <SearchVideos
                  chat_history={history.slice(0, messageIndex - 1)}
                  query={query}
                  autoFetch={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageBox;
