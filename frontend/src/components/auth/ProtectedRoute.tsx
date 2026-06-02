"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Show nothing while checking auth or redirecting
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 rounded-full border-2 border-[#24A0ED] border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
