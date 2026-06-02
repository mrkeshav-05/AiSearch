'use client';

import { type DocumentStatus } from '@/types/library.types';

const CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  uploaded: {
    label: 'Queued',
    className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  },
  processing: {
    label: 'Processing',
    className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 animate-pulse',
  },
  indexed: {
    label: 'Indexed',
    className: 'bg-green-500/15 text-green-400 border border-green-500/30',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/15 text-red-400 border border-red-500/30',
  },
};

interface StatusBadgeProps {
  status: DocumentStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
