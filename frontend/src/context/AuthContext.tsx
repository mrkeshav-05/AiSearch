"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const applyToken = useCallback(async (jwt: string) => {
    localStorage.setItem("auth_token", jwt);
    setToken(jwt);
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.ok) {
      const json = await res.json();
      setUser(json.data.user);
    } else {
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    }
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (stored) {
      applyToken(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [applyToken]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Login failed");
    await applyToken(json.data.token);
  };

  const signup = async (email: string, name: string, password: string) => {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Signup failed");
    await applyToken(json.data.token);
  };

  const loginWithGoogle = () => {
    window.location.href = `${BACKEND_URL}/api/v1/auth/google`;
  };

  const logout = () => {
    try {
      localStorage.removeItem("auth_token");
      sessionStorage.clear();
      // Try to clear any cookies just in case
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
    } catch (e) {
      console.error(e);
    }
    
    setToken(null);
    setUser(null);
    
    // Aggressive hard reload to wipe Next.js memory
    setTimeout(() => {
      window.location.replace("/login");
    }, 100);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
