'use client';

import { motion } from 'framer-motion';
import { BookOpenText, ArrowRight } from 'lucide-react';

export default function EmptyState() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center gap-4 py-20 text-center"
    >
      <motion.div variants={itemVariants} className="rounded-full bg-light-100 dark:bg-dark-100 p-4">
        <BookOpenText className="h-8 w-8 text-light-300 dark:text-dark-300" />
      </motion.div>

      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold text-black dark:text-white">No documents yet</h3>
        <p className="mt-1 text-sm text-light-400 dark:text-dark-400">Start by uploading your first PDF to build your knowledge base</p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex items-center gap-1 rounded-full bg-[#24A0ED]/10 px-3 py-1.5 text-xs font-medium text-[#24A0ED]"
      >
        Tip: Upload multiple documents to chat across them
        <ArrowRight className="h-3 w-3" />
      </motion.div>
    </motion.div>
  );
}
