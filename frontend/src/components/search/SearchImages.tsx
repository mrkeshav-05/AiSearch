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
    if (autoFetch && query && images === null) {
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
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Loading Images…</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/5 rounded-xl aspect-video" />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col items-center gap-3 py-10 px-4 rounded-xl border border-dashed border-[var(--glass-border)] text-center mt-2">
          <ImageOff size={24} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">Could not load images</p>
          <button
            onClick={fetchImages}
            className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            <RefreshCcw size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {Array.isArray(images) && images.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center gap-3 py-10 px-4 rounded-xl border border-dashed border-[var(--glass-border)] text-center mt-2">
          <ImageIcon size={24} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">No images found for this query.</p>
        </div>
      )}

      {/* Images grid */}
      {Array.isArray(images) && images.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-[var(--text-muted)]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Images</span>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-3)] px-2 py-0.5 rounded-full ml-auto">
              {images.length} found
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, i) => {
              let domain = "";
              try {
                domain = new URL(img.url).hostname.replace("www.", "");
              } catch (e) {
                domain = img.url;
              }

              return (
                <a
                  key={i}
                  href={img.url || img.img_src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative rounded-xl overflow-hidden aspect-video group hover:scale-[1.03] transition-all duration-300 shadow-md hover:shadow-cyan-500/10 cursor-pointer border border-transparent hover:border-cyan-500/30 bg-[var(--surface-2)]"
                >
                  <Image
                    src={img.img_src}
                    alt={img.title || "Image"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {/* Perplexity-style Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                    <p className="text-white text-xs font-medium line-clamp-2 leading-tight shadow-sm">
                      {img.title}
                    </p>
                    <p className="text-white/70 text-[10px] mt-1 truncate">
                      {domain}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchImages;