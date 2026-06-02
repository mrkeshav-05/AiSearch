"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Calendar } from "lucide-react";

function ProfileContent() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-white mb-8">Profile</h1>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-20 h-20 rounded-full bg-[#24A0ED] flex items-center justify-center text-white text-3xl font-bold shrink-0 overflow-hidden">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-xl font-semibold text-white">{user.name}</p>
            <p className="text-sm text-white/50">{user.email}</p>
          </div>
        </div>

        {/* Info cards */}
        <div className="space-y-3">
          <div className="flex items-center gap-4 bg-[#111111] border border-[#1C1C1C] rounded-xl px-5 py-4">
            <User size={18} className="text-[#24A0ED] shrink-0" />
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">Name</p>
              <p className="text-sm text-white">{user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#111111] border border-[#1C1C1C] rounded-xl px-5 py-4">
            <Mail size={18} className="text-[#24A0ED] shrink-0" />
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">Email</p>
              <p className="text-sm text-white">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#111111] border border-[#1C1C1C] rounded-xl px-5 py-4">
            <Calendar size={18} className="text-[#24A0ED] shrink-0" />
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mb-0.5">Member since</p>
              <p className="text-sm text-white">
                {new Date(user.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
