'use client';

import { useEffect, useRef } from 'react';
import { X, BookOpen, FileText } from 'lucide-react';
import type { Citation } from '@/types/library.types';

interface CitationModalProps {
  citation: Citation;
  onClose: () => void;
}

export default function CitationModal({ citation, onClose }: CitationModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-light-200 dark:border-dark-200 p-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 rounded-lg bg-[#24A0ED]/15 p-1.5">
              <BookOpen className="h-4 w-4 text-[#24A0ED]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-black dark:text-white">
                {citation.documentTitle}
              </p>
              <p className="text-xs text-light-400 dark:text-dark-400">
                {citation.pageNumber ? `Page ${citation.pageNumber}` : 'Unknown page'}
                {' · '}Chunk {citation.chunkIndex + 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-2 rounded-lg p-1.5 text-light-400 dark:text-dark-400 hover:bg-light-100 dark:hover:bg-dark-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Excerpt */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-3.5 w-3.5 text-light-400 dark:text-dark-400" />
            <span className="text-xs font-medium text-light-400 dark:text-dark-400 uppercase tracking-wide">
              Excerpt
            </span>
          </div>
          <blockquote className="rounded-xl border border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary px-4 py-3 text-sm leading-relaxed text-black dark:text-white italic">
            &ldquo;{citation.snippet}&rdquo;
          </blockquote>
        </div>
      </div>
    </div>
  );
}
