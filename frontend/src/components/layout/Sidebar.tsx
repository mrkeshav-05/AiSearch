"use client";

import {
  Home,
  Search,
  BookOpenText,
  CircleAlert,
  LogIn,
  LogOut,
  User,
  Settings,
  HelpCircle,
  ChevronRight,
  PanelLeftOpen,
  PanelLeftClose,
  MessageSquare,
  Trash2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegments } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useChatHistory } from "@/context/ChatHistoryContext";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// ── Profile dropdown ─────────────────────────────────────────────────────────
function ProfileMenu({
  user,
  anchorRef,
  onClose,
  onLogout,
}: {
  user: { name: string; email: string; avatar_url: string | null };
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const menu = (
    <div
      ref={menuRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-56 rounded-2xl border border-[#2C2C2C] bg-[#1A1A1A] shadow-2xl py-1 overflow-hidden"
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
        onClick={() => { onLogout(); onClose(); }}
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Group sessions by date label
  const groups: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    const label = formatDate(s.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#1C1C1C]">
        <h2 className="text-sm font-semibold text-white">Chat History</h2>
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
      <div className="flex-1 overflow-y-auto py-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-white/30">
            <MessageSquare size={28} />
            <p className="text-xs">No history yet</p>
          </div>
        ) : (
          Object.entries(groups).map(([label, items]) => (
            <div key={label}>
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">{label}</p>
              {items.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors ${
                    session.id === currentSessionId
                      ? "bg-[#24A0ED]/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <MessageSquare size={13} className="shrink-0 opacity-60" />
                  <span className="flex-1 text-xs truncate">{session.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))
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
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const mobileAvatarButtonRef = useRef<HTMLButtonElement>(null);

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
    { icon: Search, href: "/", active: segments.includes("discover"), label: "Discover" },
    { icon: BookOpenText, href: "/", active: segments.includes("library"), label: "Library" },
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

          {/* Bottom: CircleAlert + profile */}
          <div className="flex flex-col items-center gap-3 relative">
            <Link
              href="/"
              title="Info"
              className="text-white/50 hover:text-[#24A0ED] transition-colors"
            >
              <CircleAlert size={20} />
            </Link>

            {user ? (
              <div className="relative">
                <button
                  ref={avatarButtonRef}
                  onClick={() => setProfileOpen((o) => !o)}
                  title="Account"
                  className="w-9 h-9 rounded-full bg-[#24A0ED] flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent hover:ring-[#24A0ED]/50 transition-all overflow-hidden"
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
                    anchorRef={avatarButtonRef}
                    onClose={() => setProfileOpen(false)}
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
            ref={mobileAvatarButtonRef}
            onClick={() => setProfileOpen((o) => !o)}
            className="relative flex flex-col items-center space-y-1 flex-1 text-white/60"
          >
            <div className="w-6 h-6 rounded-full bg-[#24A0ED] flex items-center justify-center text-white text-[10px] font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px]">Profile</span>
            {profileOpen && (
              <ProfileMenu
                user={user}
                anchorRef={mobileAvatarButtonRef}
                onClose={() => setProfileOpen(false)}
                onLogout={logout}
              />
            )}
          </button>
        ) : (
          <Link href="/login" className="flex flex-col items-center space-y-1 flex-1 text-white/60 hover:text-[#24A0ED]">
            <LogIn size={20} />
            <span className="text-[10px]">Sign in</span>
          </Link>
        )}
      </div>

      {/* ── Main content ── */}
      <main
        className="bg-[#0A0A0A] min-h-screen pb-20 lg:pb-0 transition-all duration-300"
        style={{ paddingLeft: `${RAIL_W + (panelOpen ? PANEL_W : 0)}px` }}
      >
        <div className="max-w-screen-lg mx-auto px-4">{children}</div>
      </main>
    </>
  );
};

export default Sidebar;
