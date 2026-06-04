"use client";

import { Play, VideoIcon, RefreshCcw, VideoOff } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Lightbox, { GenericSlide, type VideoSlide } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Message } from "@/components/chat/ChatWindow";

type Video = {
  metadata: {
    url: string;
    thumbnail: string;
    title: string;
    iframe_src: string;
  };
  pageContent: string;
};

declare module "yet-another-react-lightbox" {
  export interface VideoSlide extends GenericSlide {
    type: "video-slide";
    src: string;
    iframe_src: string;
  }
  interface SlideTypes {
    "video-slide": VideoSlide;
  }
}

const SearchVideos = ({
  query,
  chat_history,
  autoFetch = false,
}: {
  query: string;
  chat_history: Message[];
  autoFetch?: boolean;
}) => {
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [slides, setSlides] = useState<VideoSlide[]>([]);

  const fetchVideos = async () => {
    if (!query) return;
    setLoading(true);
    setError(false);
    try {
      console.log("[Videos] Fetching videos for:", query);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL_V1}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, chat_history }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log("[Videos] Response status:", res.status, "| Count:", data.sources?.length ?? 0);
      const fetched: Video[] = data.sources ?? [];
      setVideos(fetched);
      setSlides(
        fetched.map((v) => ({
          type: "video-slide",
          iframe_src: v.metadata.iframe_src,
          src: v.metadata.thumbnail,
        }))
      );
    } catch (err) {
      console.error("[Videos] Fetch error:", err);
      setError(true);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount when autoFetch is true
  useEffect(() => {
    if (autoFetch && query && videos === null) {
      fetchVideos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, query]);

  return (
    <div className="w-full">
      {/* Trigger button */}
      {!autoFetch && !loading && videos === null && (
        <button
          onClick={fetchVideos}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-all duration-200 group"
        >
          <div className="flex items-center gap-2">
            <VideoIcon size={15} className="text-[var(--text-muted)] group-hover:text-purple-400 transition-colors" />
            <span>Search videos</span>
          </div>
          <VideoIcon size={14} className="text-purple-400" />
        </button>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 mb-1">
            <VideoIcon size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Loading Videos…</span>
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
          <VideoOff size={20} className="text-[var(--text-muted)]" />
          <p className="text-xs text-[var(--text-muted)]">Could not load videos</p>
          <button
            onClick={fetchVideos}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            <RefreshCcw size={11} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {Array.isArray(videos) && videos.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center gap-2 py-5 px-4 rounded-xl border border-dashed border-[var(--glass-border)] text-center">
          <VideoIcon size={18} className="text-[var(--text-muted)]" />
          <p className="text-xs text-[var(--text-muted)]">No videos found for this query</p>
        </div>
      )}

      {/* Videos grid */}
      {videos !== null && videos.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-1.5">
            <VideoIcon size={12} className="text-[var(--text-muted)]" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Videos</span>
            <span className="text-[10px] text-[var(--text-muted)] ml-auto">{videos.length} found</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(videos.length > 4 ? videos.slice(0, 3) : videos).map((video, i) => (
              <div
                key={i}
                onClick={() => {
                  // Open source URL directly if no iframe_src
                  if (video.metadata.iframe_src) {
                    setOpen(true);
                    setSlides([slides[i], ...slides.slice(0, i), ...slides.slice(i + 1)]);
                  } else {
                    window.open(video.metadata.url, "_blank", "noopener,noreferrer");
                  }
                }}
                className="relative rounded-xl overflow-hidden aspect-video cursor-pointer group"
              >
                {video.metadata.thumbnail ? (
                  <Image
                    src={video.metadata.thumbnail}
                    alt={video.metadata.title || "Video"}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-[var(--surface-3)] flex items-center justify-center">
                    <VideoIcon size={24} className="text-[var(--text-muted)]" />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100">
                    <Play size={15} className="text-white ml-0.5" fill="white" />
                  </div>
                </div>
                {/* Title tooltip */}
                {video.metadata.title && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[9px] line-clamp-1">{video.metadata.title}</p>
                  </div>
                )}
              </div>
            ))}

            {videos.length > 4 && (
              <button
                onClick={() => setOpen(true)}
                className="relative rounded-xl overflow-hidden aspect-video bg-[var(--surface-3)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] flex flex-col items-center justify-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200"
              >
                <div className="flex -space-x-1">
                  {videos.slice(3, 6).map((v, i) =>
                    v.metadata.thumbnail ? (
                      <div key={i} className="w-6 h-6 rounded overflow-hidden border border-[var(--glass-border)]">
                        <Image src={v.metadata.thumbnail} alt="" width={24} height={24} className="object-cover w-full h-full" unoptimized />
                      </div>
                    ) : null
                  )}
                </div>
                <span className="text-[10px]">+{videos.length - 3} more</span>
              </button>
            )}
          </div>

          <Lightbox
            open={open}
            close={() => setOpen(false)}
            slides={slides}
            render={{
              slide: ({ slide }) =>
                slide.type === "video-slide" ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <iframe
                      src={(slide as VideoSlide).iframe_src}
                      title="Video"
                      className="aspect-video max-h-[90vh] w-[90vw] md:w-[75vw] rounded-2xl"
                      allowFullScreen
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                ) : null,
            }}
          />
        </>
      )}
    </div>
  );
};

export default SearchVideos;