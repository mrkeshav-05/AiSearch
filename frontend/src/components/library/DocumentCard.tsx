'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Trash2, RefreshCw, AlertTriangle, MessageSquare, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import StatusBadge from './StatusBadge';
import type { Document } from '@/types/library.types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
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
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
      className={`group relative flex flex-col rounded-xl border transition-all duration-200
        ${
          selected
            ? 'border-[#24A0ED] bg-[#24A0ED]/5 ring-1 ring-[#24A0ED]/20'
            : 'border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary hover:border-light-300 dark:hover:border-dark-300 hover:shadow-lg'
        }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="mt-0.5 flex-shrink-0 rounded-lg bg-light-100 dark:bg-dark-100 p-2.5 group-hover:bg-[#24A0ED]/10">
          <FileText className="h-5 w-5 text-light-400 dark:text-dark-400 group-hover:text-[#24A0ED]" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <p className="truncate text-sm font-semibold text-black dark:text-white" title={doc.title}>
            {doc.title}
          </p>
          {/* Filename */}
          <p className="mt-0.5 truncate text-xs text-light-400 dark:text-dark-400" title={doc.filename}>
            {doc.filename}
          </p>

          {/* Metadata chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={doc.status} />
            <span className="text-xs text-light-400 dark:text-dark-400">{formatBytes(doc.fileSize)}</span>
            {doc.pageCount && <span className="text-xs text-light-400 dark:text-dark-400">{doc.pageCount}p</span>}
            {doc.chunkCount !== undefined && doc.chunkCount > 0 && (
              <span className="text-xs text-light-400 dark:text-dark-400">{doc.chunkCount} chunks</span>
            )}
            <span className="text-xs text-light-400 dark:text-dark-400">{formatDate(doc.createdAt)}</span>
          </div>

          {/* Error message */}
          {doc.status === 'failed' && doc.errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-500/10 p-2 text-xs text-red-400"
            >
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <p className="line-clamp-2">{doc.errorMsg}</p>
            </motion.div>
          )}
        </div>

        {/* Select checkbox / More menu */}
        <div className="flex items-center gap-1">
          {isIndexed && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleSelect(doc.id)}
              title={selected ? 'Deselect' : 'Select for chat'}
              className={`flex h-5 w-5 items-center justify-center rounded border transition-all
                ${
                  selected
                    ? 'border-[#24A0ED] bg-[#24A0ED] text-white'
                    : 'border-light-300 dark:border-dark-300 hover:border-[#24A0ED]'
                }`}
            >
              {selected && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-3 w-3"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
              )}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowActions(!showActions)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-light-400 dark:text-dark-400 hover:bg-light-100 dark:hover:bg-dark-100 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* Actions menu */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="border-t border-light-200 dark:border-dark-200 flex items-center gap-1 bg-light-secondary/50 dark:bg-dark-secondary/50 p-2"
          >
            {doc.status === 'failed' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { onReindex(doc.id); setShowActions(false); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-500/10 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </motion.button>
            )}

            {isIndexed && selected && (
              <span className="flex flex-1 items-center justify-center gap-1 text-xs font-medium text-[#24A0ED]">
                <MessageSquare className="h-3.5 w-3.5" /> In chat
              </span>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { onDelete(doc.id); setShowActions(false); }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
