"use client";

import {
  Home,
  Search,
  BookOpenText,
  LogIn,
  LogOut,
  User,
  Settings,
  HelpCircle,
  ChevronRight,
  PanelLeftOpen,
  PanelLeftClose,
  MessageSquare,
  Globe,
  Trash2,
  Plus,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useChatHistory } from "@/context/ChatHistoryContext";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// ── Profile dropdown (viewport-aware, animated) ───────────────────────────────
function ProfileMenu({
  user,
  anchorEl,
  onClose,
  onLogout,
}: {
  user: { name: string; email: string; avatar_url: string | null };
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);

  // Compute viewport-safe position after first paint (so we know menu dimensions)
  useEffect(() => {
    if (!anchorEl || !menuRef.current) return;
    const anchor = anchorEl.getBoundingClientRect();
    const menuW = menuRef.current.offsetWidth || 224;
    const menuH = menuRef.current.offsetHeight || 240;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 8;

    // Default: open to the right of the anchor
    let left = anchor.right + GAP;
    let top = anchor.top;

    // Overflows right → open to the left of the anchor
    if (left + menuW > vw - GAP) {
      left = anchor.left - menuW - GAP;
    }
    // Still overflows left → clamp to screen edge
    if (left < GAP) left = GAP;

    // Overflows bottom → shift up
    if (top + menuH > vh - GAP) {
      top = Math.max(GAP, vh - menuH - GAP);
    }
    if (top < GAP) top = GAP;

    setCoords({ top, left });
    // Trigger entrance animation on next frame
    requestAnimationFrame(() => setVisible(true));
  }, [anchorEl]);

  // Close on outside click (but NOT when clicking the anchor itself — let toggle handle it)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorEl]);

  const menu = (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: coords ? coords.top : -9999,
        left: coords ? coords.left : -9999,
        zIndex: 9999,
      }}
      className={`w-56 rounded-2xl border border-[#2C2C2C] bg-[#1A1A1A] shadow-2xl py-1 overflow-hidden
        transition-all duration-150 origin-bottom-left
        ${visible && coords ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-1"}`}
    >
      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2C2C2C]">
        <div className="w-8 h-8 rounded-full bg-[#24A0ED] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
          {user.avatar_url ? (
            <Image src={user.avatar_url} alt={user.name} width={32} height={32} className="rounded-full" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">{user.name}</p>
          <p className="text-[10px] text-white/40 truncate">{user.email}</p>
        </div>
      </div>

      <button
        onClick={() => { router.push("/profile"); onClose(); }}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        <User size={15} />
        Profile
      </button>

      <button
        onClick={() => { router.push("/settings"); onClose(); }}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Settings size={15} />
        Settings
      </button>

      <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
        <HelpCircle size={15} />
        <span>Help</span>
        <ChevronRight size={13} className="ml-auto" />
      </div>

      <div className="border-t border-[#2C2C2C] my-1" />

      <button
        onClick={() => { 
          onLogout(); 
        }}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <LogOut size={15} />
        Log out
      </button>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(menu, document.body);
}

// ── History panel ────────────────────────────────────────────────────────────
function HistoryPanel({
  onNewChat,
  onSelectSession,
}: {
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}) {
  const { sessions, deleteSession, clearAll, currentSessionId } = useChatHistory();
  const router = useRouter();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const aiSessions = sessions.filter((s) => s.source !== "search");
  const searchSessions = sessions.filter((s) => s.source === "search");

  // Group an array of sessions by date
  function groupByDate(list: typeof sessions) {
    const groups: Record<string, typeof sessions> = {};
    for (const s of list) {
      const label = formatDate(s.createdAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(s);
    }
    return groups;
  }

  function SessionItem({ session }: { session: typeof sessions[0] }) {
    const isSearch = session.source === "search";
    return (
      <div
        className={`group flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors ${
          session.id === currentSessionId
            ? "bg-[#24A0ED]/10 text-white"
            : "text-white/60 hover:bg-white/5 hover:text-white"
        }`}
        onClick={() => {
          if (isSearch) {
            // Re-open the discover page with the original query
            const userMsg = session.messages.find((m) => m.role === "user");
            if (userMsg) router.push(`/discover?q=${encodeURIComponent(userMsg.content)}`);
          } else {
            onSelectSession(session.id);
          }
        }}
      >
        {isSearch
          ? <Globe size={13} className="shrink-0 opacity-60 text-emerald-400" />
          : <MessageSquare size={13} className="shrink-0 opacity-60" />
        }
        <span className="flex-1 text-xs truncate">{session.title}</span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
          className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  }

  function SourceGroup({
    label,
    icon,
    items,
    accent,
  }: {
    label: string;
    icon: React.ReactNode;
    items: typeof sessions;
    accent: string;
  }) {
    const [collapsed, setCollapsed] = useState(false);
    if (items.length === 0) return null;
    const groups = groupByDate(items);
    return (
      <div>
        {/* Source header */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`flex w-full items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest ${accent} hover:text-white transition-colors`}
        >
          {icon}
          {label}
          <ChevronRight size={10} className={`ml-auto transition-transform ${collapsed ? "" : "rotate-90"}`} />
        </button>
        {!collapsed && Object.entries(groups).map(([dateLabel, group]) => (
          <div key={dateLabel}>
            <p className="px-4 py-0.5 text-[10px] text-white/20 tracking-wide">{dateLabel}</p>
            {group.map((s) => <SessionItem key={s.id} session={s} />)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#1C1C1C]">
        <h2 className="text-sm font-semibold text-white">History</h2>
        <button
          onClick={onNewChat}
          title="New chat"
          className="flex items-center gap-1.5 text-xs text-[#24A0ED] hover:text-white transition-colors"
        >
          <Plus size={14} />
          New
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-white/10">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/30">
            <MessageSquare size={28} />
            <p className="text-xs">No history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <SourceGroup
              label="AI Chat"
              icon={<MessageSquare size={10} />}
              items={aiSessions}
              accent="text-[#24A0ED]/70"
            />
            <SourceGroup
              label="Web Search"
              icon={<Globe size={10} />}
              items={searchSessions}
              accent="text-emerald-400/70"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      {sessions.length > 0 && (
        <div className="border-t border-[#1C1C1C] px-4 py-3">
          <button
            onClick={clearAll}
            className="text-xs text-white/30 hover:text-red-400 transition-colors"
          >
            Clear all history
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
const Sidebar = ({
  children,
  onNewChat,
  onSelectSession,
}: {
  children: React.ReactNode;
  onNewChat?: () => void;
  onSelectSession?: (id: string) => void;
}) => {
  const segments = useSelectedLayoutSegments();
  const { user, logout } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const profileOpen = profileAnchorEl !== null;

  // Toggle: clicking the same button again closes the menu
  function toggleProfile(el: HTMLButtonElement) {
    setProfileAnchorEl((prev) => (prev === el ? null : el));
  }
  function closeProfile() {
    setProfileAnchorEl(null);
  }

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleNewChat = useCallback(() => {
    onNewChat?.();
    setPanelOpen(false);
  }, [onNewChat]);

  const handleSelectSession = useCallback((id: string) => {
    onSelectSession?.(id);
    setPanelOpen(false);
  }, [onSelectSession]);

  const navLinks = [
    { icon: Home, href: "/", active: segments.length === 0, label: "Home" },
    { icon: Search, href: "/discover", active: segments.includes("discover"), label: "Discover" },
    { icon: BookOpenText, href: "/library", active: segments.includes("library"), label: "Library" },
  ];

  const RAIL_W = 64;   // px — the icon rail
  const PANEL_W = 260; // px — history panel

  return (
    <>
      {/* ── Desktop icon rail ── */}
      <div
        className="hidden lg:flex lg:fixed lg:inset-y-0 lg:z-50 lg:flex-col"
        style={{ width: RAIL_W }}
      >
        <div className="flex grow flex-col items-center justify-between overflow-y-auto bg-[#111111] px-2 py-6">
          {/* Logo + toggle */}
          <div className="flex flex-col items-center gap-3 w-full">
            <Link
              href="/"
              title="AI Search - Home"
              className="flex items-center justify-center p-2 rounded-xl transition-all duration-200"
            >
              <Image
                src="brain.svg"
                alt="AI Brain Logo"
                width={36}
                height={36}
                style={{ filter: "brightness(0) invert(1)", transition: "filter 0.2s" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter =
                    "brightness(0) saturate(100%) invert(47%) sepia(69%) saturate(6010%) hue-rotate(194deg) brightness(101%) contrast(101%)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "brightness(0) invert(1)";
                }}
              />
            </Link>

            {/* Panel toggle */}
            <button
              onClick={() => setPanelOpen((o) => !o)}
              title={panelOpen ? "Close history" : "Open history"}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-white/50 hover:text-[#24A0ED] hover:bg-white/5 transition-colors"
            >
              {panelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
          </div>

          {/* Nav links */}
          <div className="flex flex-col items-center gap-2 w-full">
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                title={link.label}
                className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-150
                  ${link.active ? "text-[#24A0ED] bg-[#24A0ED]/10" : "text-white/60 hover:text-[#24A0ED] hover:bg-white/5"}`}
              >
                <link.icon size={20} />
                {link.active && (
                  <div className="absolute right-0 -mr-2 top-1/2 -translate-y-1/2 h-5 w-1 rounded-l-lg bg-[#24A0ED]" />
                )}
              </Link>
            ))}
          </div>

          {/* Bottom: Help + profile */}
          <div className="flex flex-col items-center gap-3 relative">
            <Link
              href="/"
              title="Info"
              className="text-white/50 hover:text-[#24A0ED] transition-colors"
            >
              <HelpCircle size={20} />
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={(e) => toggleProfile(e.currentTarget)}
                  title="Account"
                  className={`w-9 h-9 rounded-full bg-[#24A0ED] flex items-center justify-center text-white text-xs font-bold ring-2 transition-all overflow-hidden ${
                    profileOpen ? "ring-[#24A0ED]/70" : "ring-transparent hover:ring-[#24A0ED]/50"
                  }`}
                >
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </button>
                {profileOpen && (
                  <ProfileMenu
                    user={user}
                    anchorEl={profileAnchorEl}
                    onClose={closeProfile}
                    onLogout={logout}
                  />
                )}
              </div>
            ) : (
              <Link
                href="/login"
                title="Sign in"
                className="text-white/50 hover:text-[#24A0ED] transition-colors"
              >
                <LogIn size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop history panel ── */}
      <div
        className={`hidden lg:flex lg:fixed lg:inset-y-0 lg:z-40 lg:flex-col bg-[#0F0F0F] border-r border-[#1C1C1C] transition-all duration-300 overflow-hidden`}
        style={{
          left: RAIL_W,
          width: panelOpen ? PANEL_W : 0,
          opacity: panelOpen ? 1 : 0,
          pointerEvents: panelOpen ? "auto" : "none",
        }}
      >
        <div style={{ width: PANEL_W }}>
          <HistoryPanel onNewChat={handleNewChat} onSelectSession={handleSelectSession} />
        </div>
      </div>

      {/* ── Mobile top bar (hamburger top-left) ── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-[#1C1C1C] lg:hidden">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="text-white/60 hover:text-[#24A0ED] transition-colors"
          title="Chat history"
        >
          <Menu size={22} />
        </button>
        <span className="text-sm font-semibold text-[#24A0ED]">AiSearch</span>
        {user ? (
          <button
            onClick={(e) => toggleProfile(e.currentTarget)}
            className={`w-8 h-8 rounded-full bg-[#24A0ED] flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-2 transition-all ${
              profileOpen ? "ring-[#24A0ED]/70" : "ring-transparent"
            }`}
          >
            {user.avatar_url ? (
              <Image src={user.avatar_url} alt={user.name} width={32} height={32} className="rounded-full" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </button>
        ) : (
          <Link href="/login" className="text-white/60 hover:text-[#24A0ED] transition-colors">
            <LogIn size={20} />
          </Link>
        )}
        {profileOpen && (
          <ProfileMenu
            user={user!}
            anchorEl={profileAnchorEl}
            onClose={closeProfile}
            onLogout={logout}
          />
        )}
      </div>

      {/* ── Mobile bottom bar ── */}
      <div className="fixed bottom-0 flex flex-row w-full z-50 items-center gap-x-6 bg-[#111111] px-4 py-4 shadow-sm lg:hidden border-t border-[#1C1C1C]">
        {navLinks.map((link, i) => (
          <Link
            key={i}
            href={link.href}
            className={`relative flex flex-col items-center space-y-1 text-center flex-1 hover:text-[#24A0ED]
              ${link.active ? "text-[#24A0ED]" : "text-white/60"}`}
          >
            {link.active && (
              <div className="absolute top-0 -mt-4 w-full h-0.5 rounded-b-lg bg-[#24A0ED]" />
            )}
            <link.icon size={20} />
            <span className="text-[10px]">{link.label}</span>
          </Link>
        ))}
        {user ? (
          <button
            onClick={(e) => toggleProfile(e.currentTarget)}
            className="relative flex flex-col items-center space-y-1 flex-1 text-white/60"
          >
            <div className={`w-6 h-6 rounded-full bg-[#24A0ED] flex items-center justify-center text-white text-[10px] font-bold ring-2 transition-all ${
              profileOpen ? "ring-[#24A0ED]/70" : "ring-transparent"
            }`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px]">Profile</span>
          </button>
        ) : (
          <Link href="/login" className="flex flex-col items-center space-y-1 flex-1 text-white/60 hover:text-[#24A0ED]">
            <LogIn size={20} />
            <span className="text-[10px]">Sign in</span>
          </Link>
        )}
      </div>

      {/* ── Mobile history drawer ── */}
      {mobileDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/60 lg:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed inset-y-0 left-0 z-[70] w-72 bg-[#0F0F0F] border-r border-[#1C1C1C] flex flex-col lg:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#1C1C1C]">
              <span className="text-sm font-semibold text-white">Chat History</span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HistoryPanel
                onNewChat={() => { handleNewChat(); setMobileDrawerOpen(false); }}
                onSelectSession={(id) => { handleSelectSession(id); setMobileDrawerOpen(false); }}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <main
        className="bg-[#0A0A0A] min-h-screen pb-20 pt-14 lg:pt-0 lg:pb-0 transition-all duration-300"
        style={{
          paddingLeft: isDesktop ? `${RAIL_W + (panelOpen ? PANEL_W : 0)}px` : 0,
        }}
      >
        <div className="max-w-screen-lg mx-auto px-4">{children}</div>
      </main>
    </>
  );
};

export default Sidebar;
