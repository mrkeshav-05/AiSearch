"use client";

import { ImageIcon, ZoomIn, RefreshCcw, ImageOff } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Message } from "@/components/chat/ChatWindow";

type ImageResult = {
  url: string;
  img_src: string;
  title: string;
};

const SearchImages = ({
  query,
  chat_history,
  autoFetch = false,
}: {
  query: string;
  chat_history: Message[];
  autoFetch?: boolean;
}) => {
  const [images, setImages] = useState<ImageResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [slides, setSlides] = useState<{ src: string }[]>([]);

  const fetchImages = async () => {
    if (!query) return;
    setLoading(true);
    setError(false);
    setImages(null);
    setSlides([]);
    try {
      console.log("[Images] Fetching images for:", query);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL_V1}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chat_history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("[Images] Response status:", res.status, "| Count:", data.images?.length ?? 0);
      const fetched: ImageResult[] = data.images ?? [];
      if (fetched.length > 0) {
        setImages(fetched);
        setSlides(fetched.filter((i) => i.img_src).map((i) => ({ src: i.img_src })));
      } else {
        setImages([]);
      }
    } catch (err) {
      console.error("[Images] Fetch error:", err);
      setError(true);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount when autoFetch is true
  useEffect(() => {
    if (autoFetch && query) {
      fetchImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, query]);

  return (
    <div className="w-full">
      {/* Trigger button — shown only when not autoFetch and not yet loaded */}
      {!autoFetch && !loading && images === null && (
        <button
          onClick={fetchImages}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-all duration-200 group"
        >
          <div className="flex items-center gap-2">
            <ImageIcon size={15} className="text-[var(--text-muted)] group-hover:text-blue-400 transition-colors" />
            <span>Search images</span>
          </div>
          <ImageIcon size={14} className="text-blue-400" />
        </button>
      )}

      {/* Skeleton loading */}
      {loading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 mb-1">
            <ImageIcon size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Loading Images…</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton rounded-xl aspect-video" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center gap-2 py-6 px-4 rounded-xl border border-dashed border-[var(--glass-border)] text-center">
          <ImageOff size={20} className="text-[var(--text-muted)]" />
          <p className="text-xs text-[var(--text-muted)]">Could not load images</p>
          <button
            onClick={fetchImages}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <RefreshCcw size={11} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {Array.isArray(images) && images.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center gap-2 py-5 px-4 rounded-xl border border-dashed border-[var(--glass-border)] text-center">
          <ImageIcon size={18} className="text-[var(--text-muted)]" />
          <p className="text-xs text-[var(--text-muted)]">No images found for this query</p>
        </div>
      )}

      {/* Images grid */}
      {Array.isArray(images) && images.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-1.5">
            <ImageIcon size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Images</span>
            <span className="text-[10px] text-[var(--text-muted)] ml-auto">{images.length} found</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(images.length > 4 ? images.slice(0, 3) : images).map((img, i) => (
              <div
                key={i}
                onClick={() => {
                  setOpen(true);
                  if (slides.length > i) {
                    setSlides([slides[i], ...slides.slice(0, i), ...slides.slice(i + 1)]);
                  }
                }}
                className="relative rounded-xl overflow-hidden aspect-video cursor-zoom-in group"
              >
                <Image
                  src={img.img_src}
                  alt={img.title || "Image"}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                  <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            ))}

            {images.length > 4 && (
              <button
                onClick={() => setOpen(true)}
                className="relative rounded-xl overflow-hidden aspect-video bg-[var(--surface-3)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200"
              >
                <div className="flex -space-x-1">
                  {images.slice(3, 6).map((img, i) => (
                    <div key={i} className="w-6 h-6 rounded overflow-hidden border border-[var(--glass-border)]">
                      <Image src={img.img_src} alt="" width={24} height={24} className="object-cover w-full h-full" unoptimized />
                    </div>
                  ))}
                </div>
                <span className="text-[10px]">+{images.length - 3} more</span>
              </button>
            )}
          </div>
          <Lightbox open={open} close={() => setOpen(false)} slides={slides} />
        </>
      )}
    </div>
  );
};

export default SearchImages;