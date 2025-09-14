import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SideBar from "@/components/Sidebar";
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
        <link rel="icon" href="brain.svg"/>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
        <SideBar>
          {children}
        </SideBar>
      </body>
    </html>
  );
}
