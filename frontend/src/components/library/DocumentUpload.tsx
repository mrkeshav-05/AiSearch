'use client';

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface DocumentUploadProps {
  onUploaded: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function DocumentUpload({ onUploaded }: DocumentUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_MB = 50;

  async function uploadFile(file: File) {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds the ${MAX_MB} MB limit`);
      return;
    }

    setError(null);
    setSuccess(false);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Not authenticated. Please log in.');
        setUploading(false);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        let errorMsg = 'Upload failed';
        try {
          const body = await res.json() as { error?: string };
          errorMsg = body.error || `Server error: ${res.status}`;
        } catch {
          errorMsg = `Server error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json() as { id?: string };
      if (!data.id) {
        throw new Error('No document ID returned from server');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      onUploaded();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      console.error('Upload error:', msg);
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = '';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300
        ${
          success
            ? 'border-green-500/50 bg-green-500/5 ring-1 ring-green-500/20'
            : dragging
              ? 'border-[#24A0ED] bg-[#24A0ED]/5 ring-1 ring-[#24A0ED]/20'
              : 'border-light-200 dark:border-dark-200 hover:border-[#24A0ED]/60 hover:bg-[#24A0ED]/5 dark:hover:border-[#24A0ED]/60'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        disabled={uploading}
      />

      <motion.div
        animate={uploading ? { scale: 1.05 } : { scale: 1 }}
        className={`rounded-full p-3.5 transition-colors ${
          success
            ? 'bg-green-500/15 text-green-400'
            : dragging
              ? 'bg-[#24A0ED]/15 text-[#24A0ED]'
              : 'bg-light-100 dark:bg-dark-100 text-light-400 dark:text-dark-400 group-hover:bg-[#24A0ED]/10 group-hover:text-[#24A0ED]'
        }`}
      >
        {success
          ? <CheckCircle2 className="h-8 w-8 text-green-400" />
          : uploading
            ? <FileText className="h-8 w-8 animate-pulse text-[#24A0ED]" />
            : <Upload className="h-8 w-8 text-[#24A0ED]" />
        }
      </motion.div>

      <div>
        <p className="text-sm font-semibold text-white">
          {success ? '✓ Upload successful' : uploading ? 'Uploading & indexing…' : 'Drop a PDF here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-white/70">
          PDF only · max {MAX_MB} MB · will be indexed automatically
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs font-medium text-red-400"
        >
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </motion.div>
      )}
    </motion.div>
  );
}

