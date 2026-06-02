'use client';

import { FileText, Trash2, RefreshCw, AlertTriangle, MessageSquare } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { Document } from '@/types/library.types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface DocumentCardProps {
  doc: Document;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReindex: (id: string) => void;
}

export default function DocumentCard({
  doc,
  selected,
  onToggleSelect,
  onDelete,
  onReindex,
}: DocumentCardProps) {
  const isIndexed = doc.status === 'indexed';

  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors
        ${selected
          ? 'border-[#24A0ED] bg-[#24A0ED]/5'
          : 'border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary hover:border-light-300 dark:hover:border-dark-300'
        }`}
    >
      {/* Select checkbox */}
      {isIndexed && (
        <button
          onClick={() => onToggleSelect(doc.id)}
          title={selected ? 'Deselect' : 'Select for chat'}
          className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded border transition-colors
            ${selected
              ? 'border-[#24A0ED] bg-[#24A0ED] text-white'
              : 'border-light-300 dark:border-dark-300 hover:border-[#24A0ED]'
            }`}
        >
          {selected && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      <div className="flex items-start gap-3 pr-6">
        <div className="mt-0.5 flex-shrink-0 rounded-lg bg-light-100 dark:bg-dark-100 p-2">
          <FileText className="h-5 w-5 text-light-400 dark:text-dark-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-black dark:text-white" title={doc.title}>
            {doc.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-light-400 dark:text-dark-400">
            {doc.filename}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={doc.status} />
            <span className="text-xs text-light-400 dark:text-dark-400">{formatBytes(doc.fileSize)}</span>
            {doc.pageCount && (
              <span className="text-xs text-light-400 dark:text-dark-400">{doc.pageCount} pages</span>
            )}
            {doc.chunkCount !== undefined && doc.chunkCount > 0 && (
              <span className="text-xs text-light-400 dark:text-dark-400">{doc.chunkCount} chunks</span>
            )}
          </div>

          {doc.status === 'failed' && doc.errorMsg && (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
              <p className="text-xs text-red-400">{doc.errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1 border-t border-light-200 dark:border-dark-200 pt-3">
        {doc.status === 'failed' && (
          <button
            onClick={() => onReindex(doc.id)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-light-400 dark:text-dark-400 hover:bg-light-100 dark:hover:bg-dark-100 hover:text-black dark:hover:text-white transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}

        {isIndexed && selected && (
          <span className="flex items-center gap-1 text-xs text-[#24A0ED]">
            <MessageSquare className="h-3.5 w-3.5" /> In chat
          </span>
        )}

        <button
          onClick={() => onDelete(doc.id)}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-light-400 dark:text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  );
}
