'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  trend?: { value: number; direction: 'up' | 'down' };
}

const colorConfig: Record<string, { bg: string; icon: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', icon: 'text-blue-400', border: 'border-blue-500/30' },
  green: { bg: 'bg-green-500/10', icon: 'text-green-400', border: 'border-green-500/30' },
  yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-400', border: 'border-yellow-500/30' },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/30' },
};

export default function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  const { bg, icon: iconColor, border } = colorConfig[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`group relative overflow-hidden rounded-xl border ${border} ${bg} p-4 transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-light-400 dark:text-dark-400 uppercase tracking-wide">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-black dark:text-white">{value}</p>
            {trend && (
              <span className={`text-xs font-semibold ${trend.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
              </span>
            )}
          </div>
        </div>
        <div className={`rounded-lg p-2.5 ${bg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
  );
}
