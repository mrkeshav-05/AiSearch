"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface Props {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: Props) {
  const { login, signup, loginWithGoogle, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInput.current?.focus();
  }, []);

  useEffect(() => {
    if (user) router.push("/");
  }, [user, router]);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "oauth_denied") setError("Google sign-in was cancelled.");
    else if (oauthError === "oauth_failed") setError("Google sign-in failed. Please try again.");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, name, password);
      }
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img src="/brain.svg" alt="AiSearch" className="mx-auto h-12 w-12 brightness-0 invert" />
          <h2 className="mt-4 text-2xl font-bold text-white">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-white/50">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <Link
              href={mode === "login" ? "/signup" : "/login"}
              className="text-[#24A0ED] hover:underline"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </Link>
          </p>
        </div>

        <div className="bg-[#111111] border border-[#1C1C1C] rounded-2xl p-8 space-y-6">
          {/* Google OAuth */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#2C2C2C] bg-[#1A1A1A] px-4 py-3 text-sm font-medium text-white hover:bg-[#222222] transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-[#1C1C1C]" />
            <span className="text-xs text-white/30 uppercase tracking-widest">or</span>
            <div className="flex-1 border-t border-[#1C1C1C]" />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Full name</label>
                <input
                  ref={firstInput}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  className="w-full rounded-xl bg-[#1A1A1A] border border-[#2C2C2C] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#24A0ED] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
              <input
                ref={mode === "login" ? firstInput : undefined}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jane@example.com"
                className="w-full rounded-xl bg-[#1A1A1A] border border-[#2C2C2C] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#24A0ED] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                className="w-full rounded-xl bg-[#1A1A1A] border border-[#2C2C2C] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#24A0ED] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#24A0ED] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d8fd4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
