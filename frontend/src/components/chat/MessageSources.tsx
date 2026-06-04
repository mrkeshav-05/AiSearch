"use client";

import { Document } from "@langchain/core/documents";
import React, { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import Image from "next/image";
import { ExternalLink, X, Globe } from "lucide-react";

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/.+\/\/|www\.|\..+/g, "");
  }
};

const SourceCard = ({
  source,
  index,
  onClick,
}: {
  source: Document;
  index: number;
  onClick?: () => void;
}) => {
  const [faviconError, setFaviconError] = useState(false);
  const domain = getDomain(source.metadata.url || "");
  const faviconUrl = `https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}&sz=32`;

  const inner = (
    <div className="source-card p-3.5 flex flex-col gap-2.5 h-full cursor-pointer group min-h-[72px]"
      onClick={onClick}
    >
      {/* Title */}
      <p className="text-[var(--text-primary)] text-xs font-semibold leading-tight line-clamp-2 group-hover:text-[#93c5fd] transition-colors">
        {source.metadata.title || domain}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {!faviconError ? (
            <Image
              src={faviconUrl}
              width={14}
              height={14}
              alt=""
              className="rounded w-3.5 h-3.5 flex-shrink-0 opacity-80"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <Globe size={12} className="text-[var(--text-muted)] flex-shrink-0" />
          )}
          <span className="text-[10px] text-[var(--text-muted)] truncate">{domain}</span>
        </div>
        <span className="flex-shrink-0 text-[10px] font-bold text-[var(--accent-blue)] bg-blue-500/15 border border-blue-500/25 rounded-md px-1.5 py-0.5">
          [{index + 1}]
        </span>
      </div>
    </div>
  );

  if (onClick) return inner;

  return (
    <a
      href={source.metadata.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline"
    >
      {inner}
    </a>
  );
};

const MessageSources = ({ sources }: { sources: Document[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  const visibleSources = sources.slice(0, 3);
  const extraCount = sources.length - 3;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in-up">
        {/* First 3 source cards */}
        {visibleSources.map((source, i) => (
          <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <a href={source.metadata.url} target="_blank" rel="noopener noreferrer" className="block no-underline h-full">
              <SourceCard source={source} index={i} />
            </a>
          </div>
        ))}

        {/* "View more" card */}
        {extraCount > 0 && (
          <button
            onClick={() => setIsOpen(true)}
            className="source-card p-3 flex flex-col gap-2 cursor-pointer group animate-fade-in-up"
            style={{ animationDelay: "180ms" }}
          >
            {/* Stack of favicons */}
            <div className="flex -space-x-1">
              {sources.slice(3, 6).map((src, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full bg-[var(--surface-3)] border border-[var(--glass-border)] overflow-hidden flex-shrink-0 flex items-center justify-center"
                >
                  <Image
                    src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${src.metadata.url}&sz=32`}
                    width={14}
                    height={14}
                    alt=""
                    className="w-3 h-3"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-secondary)] group-hover:text-[#93c5fd] transition-colors mt-auto">
              View {extraCount} more
            </p>
          </button>
        )}
      </div>

      {/* Sources dialog */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          {/* Backdrop */}
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="glass-card w-full max-w-lg rounded-2xl p-5 shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <DialogTitle className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                      All Sources
                      <span className="text-[var(--text-muted)] font-normal">({sources.length})</span>
                    </DialogTitle>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                    {sources.map((source, i) => (
                      <a
                        key={i}
                        href={source.metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-card p-3 flex flex-col gap-2 group no-underline"
                      >
                        <p className="text-[var(--text-primary)] text-xs font-medium line-clamp-2 group-hover:text-[#93c5fd] transition-colors">
                          {source.metadata.title || getDomain(source.metadata.url)}
                        </p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[10px] text-[var(--text-muted)] truncate">
                            {getDomain(source.metadata.url)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1 py-0.5">
                              {i + 1}
                            </span>
                            <ExternalLink size={10} className="text-[var(--text-muted)] group-hover:text-blue-400 transition-colors" />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default MessageSources;