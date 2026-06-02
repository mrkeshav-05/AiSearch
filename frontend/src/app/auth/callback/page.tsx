"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("auth_token", token);
      // Reload so AuthContext picks up the token
      window.location.href = "/";
    } else {
      router.replace("/login?error=oauth_failed");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#24A0ED] border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
