'use client';

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileText } from 'lucide-react';

interface DocumentUploadProps {
  onUploaded: () => void;
}

export default function DocumentUpload({ onUploaded }: DocumentUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Upload failed');
      }

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors
        ${dragging ? 'border-[#24A0ED] bg-[#24A0ED]/5' : 'border-light-200 dark:border-dark-200 hover:border-[#24A0ED]/60 hover:bg-[#24A0ED]/5'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleChange}
        disabled={uploading}
      />

      <div className={`rounded-full p-3 transition-colors ${dragging ? 'bg-[#24A0ED]/15' : 'bg-light-100 dark:bg-dark-100 group-hover:bg-[#24A0ED]/10'}`}>
        {uploading
          ? <FileText className="h-7 w-7 text-[#24A0ED] animate-pulse" />
          : <Upload className="h-7 w-7 text-light-400 dark:text-dark-400 group-hover:text-[#24A0ED]" />
        }
      </div>

      <div>
        <p className="text-sm font-medium text-black dark:text-white">
          {uploading ? 'Uploading…' : 'Drop a PDF here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-light-400 dark:text-dark-400">
          PDF only · max {MAX_MB} MB
        </p>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-400">{error}</p>
      )}
    </div>
  );
}
