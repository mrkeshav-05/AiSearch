'use client';

import { motion } from 'framer-motion';
import { type DocumentStatus } from '@/types/library.types';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

const CONFIG: Record<DocumentStatus, { label: string; icon: typeof CheckCircle2; className: string; iconClassName: string }> = {
  uploaded: {
    label: 'Queued',
    icon: Clock,
    className: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    iconClassName: 'text-blue-400',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
    iconClassName: 'text-yellow-400 animate-spin',
  },
  indexed: {
    label: 'Indexed',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-400 border border-green-500/30',
    iconClassName: 'text-green-400',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-400 border border-red-500/30',
    iconClassName: 'text-red-400',
  },
};

interface StatusBadgeProps {
  status: DocumentStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, icon: Icon, className, iconClassName } = CONFIG[status];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${iconClassName}`} />
      {label}
    </motion.span>
  );
}

