"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, X, Globe, Image as ImageIcon,
  Newspaper, ChevronLeft, ChevronRight, TrendingUp, Clock, ArrowRight,
} from "lucide-react";
import Image from "next/image";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useChatHistory } from "@/context/ChatHistoryContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type SearchResult = {
  title: string;
  url: string;
  content?: string;
  img_src?: string;
  thumbnail?: string;
  author?: string;
  engines?: string[];
  publishedDate?: string;
};

type Category = "general" | "images" | "news";

const CATEGORIES: { id: Category; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "Web", icon: <Globe size={13} /> },
  { id: "images", label: "Images", icon: <ImageIcon size={13} /> },
  { id: "news", label: "News", icon: <Newspaper size={13} /> },
];

const TRENDING = [
  "Artificial Intelligence 2026", "Next.js 15 features", "Open source LLMs",
  "TypeScript best practices", "Docker compose tutorial", "Tailwind CSS v4",
  "PostgreSQL performance tips", "React Server Components",
];

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function faviconUrl(url: string) {
  try { const { origin } = new URL(url); return `${origin}/favicon.ico`; } catch { return ""; }
}

function timeAgo(dateStr?: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-[#141414] border border-[#1E1E1E] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-white/5" />
        <div className="h-3 w-32 rounded bg-white/5" />
      </div>
      <div className="h-4 w-3/4 rounded bg-white/5" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-5/6 rounded bg-white/5" />
        <div className="h-3 w-4/6 rounded bg-white/5" />
      </div>
    </div>
  );
}

function WebResultCard({ result, index }: { result: SearchResult; index: number }) {
  const [faviconError, setFaviconError] = useState(false);
  const host = hostname(result.url);
  const ago = timeAgo(result.publishedDate);

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl bg-[#141414] border border-[#1E1E1E] hover:border-[#24A0ED]/40 hover:bg-[#161b22] transition-all duration-200 p-5 shadow-sm hover:shadow-[0_0_24px_rgba(36,160,237,0.06)]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-[#1E1E1E] flex items-center justify-center overflow-hidden shrink-0">
            {!faviconError ? (
              <Image
                src={faviconUrl(result.url)}
                alt=""
                width={14}
                height={14}
                unoptimized
                onError={() => setFaviconError(true)}
                className="object-contain"
              />
            ) : (
              <Globe size={10} className="text-white/30" />
            )}
          </div>
          <span className="text-[11px] text-white/40 truncate">{host}</span>
          {ago && (
            <>
              <span className="text-white/20 text-[10px]">·</span>
              <span className="text-[11px] text-white/30">{ago}</span>
            </>
          )}
        </div>
        <Globe size={11} className="shrink-0 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
      </div>
      <h3 className="text-[#4db8ff] group-hover:text-[#24A0ED] font-semibold text-base leading-snug mb-2 transition-colors line-clamp-2">
        {result.title}
      </h3>
      <p className="text-[11px] text-white/25 mb-2 truncate">{result.url}</p>
      {result.content && (
        <p className="text-sm text-white/55 leading-relaxed line-clamp-3">{result.content}</p>
      )}
    </a>
  );
}

function NewsResultCard({ result, index }: { result: SearchResult; index: number }) {
  const [faviconError, setFaviconError] = useState(false);
  const host = hostname(result.url);
  const ago = timeAgo(result.publishedDate);

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-2xl bg-[#141414] border border-[#1E1E1E] hover:border-[#24A0ED]/40 hover:bg-[#161b22] transition-all duration-200 p-4 shadow-sm"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {(result.thumbnail || result.img_src) && (
        <div className="shrink-0 w-24 h-16 rounded-xl overflow-hidden bg-[#1E1E1E] relative">
          <Image src={result.thumbnail ?? result.img_src ?? ""} alt={result.title} fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-4 h-4 rounded-full bg-[#1E1E1E] flex items-center justify-center overflow-hidden">
            {!faviconError ? (
              <Image src={faviconUrl(result.url)} alt="" width={12} height={12} unoptimized onError={() => setFaviconError(true)} />
            ) : (
              <Globe size={9} className="text-white/30" />
            )}
          </div>
          <span className="text-[11px] text-white/40">{host}</span>
          {ago && <span className="text-[11px] text-white/30">· {ago}</span>}
          {result.author && <span className="text-[11px] text-white/30">· {result.author}</span>}
        </div>
        <h3 className="text-white group-hover:text-[#4db8ff] font-medium text-sm leading-snug mb-1 line-clamp-2 transition-colors">
          {result.title}
        </h3>
        {result.content && (
          <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{result.content}</p>
        )}
      </div>
    </a>
  );
}

function ImageGrid({ results }: { results: SearchResult[] }) {
  return (
    <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
      {results.map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block break-inside-avoid rounded-xl overflow-hidden bg-[#141414] border border-[#1E1E1E] hover:border-[#24A0ED]/50 transition-all duration-200"
        >
          {(r.img_src || r.thumbnail) && (
            <Image
              src={r.img_src ?? r.thumbnail ?? ""}
              alt={r.title}
              width={400}
              height={300}
              className="w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
            <div>
              <p className="text-[10px] text-white font-medium line-clamp-2">{r.title}</p>
              <p className="text-[9px] text-white/60 mt-0.5">{hostname(r.url)}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function LandingState({ onSearch }: { onSearch: (q: string) => void }) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("discover_recent") ?? "[]");
      setRecent(Array.isArray(stored) ? stored.slice(0, 6) : []);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-16 pb-24 space-y-14">
      {recent.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-white/30" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30">Recent</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r}
                onClick={() => onSearch(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141414] border border-[#1E1E1E] text-sm text-white/60 hover:text-white hover:border-[#24A0ED]/50 transition-all duration-150"
              >
                <Clock size={11} className="text-white/30" />
                {r}
              </button>
            ))}
          </div>
        </section>
      )}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-[#24A0ED]/70" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30">Trending</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TRENDING.map((t, i) => (
            <button
              key={t}
              onClick={() => onSearch(t)}
              className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#141414] border border-[#1E1E1E] hover:border-[#24A0ED]/40 hover:bg-[#161b22] transition-all duration-150 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white/20 w-4 text-right tabular-nums">{i + 1}</span>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">{t}</span>
              </div>
              <ArrowRight size={13} className="shrink-0 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SuggestionChips({ items, onSelect }: { items: string[]; onSelect: (s: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-6">
      <span className="text-[11px] text-white/25 self-center font-medium uppercase tracking-wider">Related</span>
      {items.slice(0, 8).map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-full bg-[#141414] border border-[#1E1E1E] text-white/50 hover:text-[#24A0ED] hover:border-[#24A0ED]/40 transition-all duration-150"
        >
          <Search size={10} />
          {s}
        </button>
      ))}
    </div>
  );
}

function DiscoverInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { saveSession } = useChatHistory();
  const sessionIdRef = useRef<string>("");

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [draft, setDraft] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<Category>((searchParams.get("cat") as Category) ?? "general");
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1"));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function saveRecent(q: string) {
    try {
      const prev: string[] = JSON.parse(localStorage.getItem("discover_recent") ?? "[]");
      const updated = [q, ...prev.filter((x) => x !== q)].slice(0, 8);
      localStorage.setItem("discover_recent", JSON.stringify(updated));
    } catch { /* ignore */ }
  }

  const doSearch = useCallback(async (q: string, cat: Category, pg: number) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    saveRecent(q);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/api/v1/search/web?q=${encodeURIComponent(q)}&category=${cat}&page=${pg}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const resultList: SearchResult[] = data.results ?? [];
      setResults(resultList);
      setSuggestions(data.suggestions ?? []);

      if (resultList.length > 0) {
        const now = new Date();
        const sessionId = sessionIdRef.current;
        const summary = resultList.slice(0, 3)
          .map((r) => `**${r.title}**\n${r.url}${r.content ? `\n${r.content}` : ""}`)
          .join("\n\n");
        saveSession(
          sessionId,
          [
            { id: `${sessionId}-q`, content: q, role: "user", createdAt: now },
            { id: `${sessionId}-r`, content: summary, role: "assistant", createdAt: now },
          ],
          "search"
        );
      }
    } catch {
      setError("Could not fetch results. Make sure SearXNG is running.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [saveSession]);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const cat = (searchParams.get("cat") as Category) ?? "general";
    const pg = parseInt(searchParams.get("page") ?? "1");
    setDraft(q);
    setQuery(q);
    setCategory(cat);
    setPage(pg);
    if (q) {
      sessionIdRef.current = `search-${q.slice(0, 40).replace(/\s+/g, "-")}-${Date.now()}`;
      doSearch(q, cat, pg);
    } else {
      setResults([]);
      setSuggestions([]);
    }
  }, [searchParams, doSearch]);

  function pushSearch(q: string, cat: Category, pg: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("cat", cat);
    params.set("page", String(pg));
    router.push(`/discover?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (q) pushSearch(q, category, 1);
  }

  const hasResults = results.length > 0;

  // Shared search form — rendered in hero (landing) or sticky header (results)
  function SearchForm({ compact }: { compact?: boolean }) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Search
            size={compact ? 14 : 16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
          <input
            ref={compact ? undefined : inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search anything…"
            autoFocus={!query && !compact}
            className={`w-full bg-[#141414] border border-[#222] rounded-2xl pl-11 pr-10 text-white placeholder-white/25 focus:outline-none focus:border-[#24A0ED]/60 focus:bg-[#161b22] transition-all duration-200 ${
              compact ? "py-2 text-sm" : "py-3.5 text-base"
            }`}
          />
          {draft && (
            <button
              type="button"
              onClick={() => { setDraft(""); inputRef.current?.focus(); }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/70 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className={`shrink-0 bg-[#24A0ED] hover:bg-[#3bb0f5] text-white font-semibold rounded-2xl transition-all duration-150 active:scale-95 shadow-lg shadow-[#24A0ED]/20 ${
            compact ? "px-4 py-2 text-sm" : "px-6 py-3.5 text-sm"
          }`}
        >
          Search
        </button>
      </form>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">

      {/* ── Sticky header (results / loading state only) ── */}
      {(query || loading) && (
        <div className="sticky top-0 z-20 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/[0.06]">
          <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
            <SearchForm compact />
            <div className="flex items-center gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pushSearch(query, c.id, 1)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all duration-150 ${
                    category === c.id
                      ? "bg-[#24A0ED]/15 text-[#24A0ED] border border-[#24A0ED]/30"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              ))}
              {hasResults && !loading && (
                <span className="ml-auto text-[11px] text-white/20">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4">

        {/* ── Landing / hero (no query) ── */}
        {!query && !loading && (
          <>
            {/* Hero search area */}
            <div className="flex flex-col items-center justify-center pt-24 pb-10 px-2">
              <div className="flex items-center gap-2 mb-2 text-[#24A0ED]/80">
                <Search size={18} strokeWidth={2.5} />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/30">Discover</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 text-center leading-tight">
                Search the web, your way
              </h1>
              <div className="w-full max-w-xl">
                <SearchForm />
              </div>
            </div>
            <LandingState onSearch={(q) => pushSearch(q, "general", 1)} />
          </>
        )}

        {loading && (
          <div className="py-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && !loading && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Search size={20} className="text-red-400" />
            </div>
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-white/30">Check that SearXNG is running on port 4000</p>
          </div>
        )}

        {!loading && !error && query && results.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Search size={22} className="text-white/20" />
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium">No results for</p>
              <p className="text-white font-semibold mt-0.5">"{query}"</p>
            </div>
            {suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-white/30 mb-3">Try one of these instead</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => pushSearch(s, category, 1)}
                      className="px-4 py-2 rounded-xl bg-[#141414] border border-[#1E1E1E] text-sm text-[#24A0ED] hover:border-[#24A0ED]/50 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && hasResults && (
          <div className="py-6">
            {category === "images" ? (
              <ImageGrid results={results} />
            ) : category === "news" ? (
              <div className="space-y-3">
                {results.map((r, i) => <NewsResultCard key={i} result={r} index={i} />)}
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((r, i) => <WebResultCard key={i} result={r} index={i} />)}
              </div>
            )}

            <SuggestionChips items={suggestions} onSelect={(s) => pushSearch(s, category, 1)} />

            <div className="flex items-center justify-between mt-10 pb-8">
              <button
                onClick={() => pushSearch(query, category, page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-[#141414] border border-[#1E1E1E] text-white/50 hover:text-white hover:border-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="text-xs text-white/25 font-medium">Page {page}</span>
              <button
                onClick={() => pushSearch(query, category, page + 1)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-[#141414] border border-[#1E1E1E] text-white/50 hover:text-white hover:border-white/20 transition-all"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <ProtectedRoute>
      <Suspense>
        <DiscoverInner />
      </Suspense>
    </ProtectedRoute>
  );
}
