import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ChatHistoryProvider } from "@/context/ChatHistoryContext";
import { ChatSessionProvider } from "@/context/ChatSessionContext";
import AppShell from "@/components/layout/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AiSearch — AI-Powered Search",
  description: "Intelligent AI search powered by real-time web results, citations, and follow-up questions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="h-full" lang="en">
      <head>
        <link rel="icon" href="brain2.svg" />
      </head>
      <body className={`${inter.variable} font-sans antialiased h-full`}>
        <AuthProvider>
          <ChatHistoryProvider>
            <ChatSessionProvider>
              <AppShell>
                {children}
              </AppShell>
            </ChatSessionProvider>
          </ChatHistoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
