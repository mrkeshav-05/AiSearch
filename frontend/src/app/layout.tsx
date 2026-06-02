import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ChatHistoryProvider } from "@/context/ChatHistoryContext";
import { ChatSessionProvider } from "@/context/ChatSessionContext";
import AppShell from "@/components/layout/AppShell";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AiSearch",
  description: "A search engine for AI models",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className="h-full"
      lang="en">
      <head>
        <link rel="icon" href="brain2.svg"/>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
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
