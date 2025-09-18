"use client";

import {
  Home,
  Search,
  BookOpenText,
  CircleAlert,
} from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import Layout from "./Layout";
import Image from "next/image";
const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const navLinks = [
    {
      icon: Home,
      href: "/",
      active: segments.length === 0,
      label: "Home",
    },
    {
      icon: Search,
      href: "/",
      active: segments.includes("discover"),
      label: "Discover",
    },
    {
      icon: BookOpenText,
      href: "/",
      active: segments.includes("library"),
      label: "Library",
    },
  ];
  return (
    <div className="bg-red-500">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-20 lg:flex-col">
        <div className="flex grow flex-col items-center justify-between gap-y-5 overflow-y-auto bg-[#111111] px-2 py-8">
          <Link
            href="/"
            title="AI Search - Home"
            className="flex items-center justify-center p-2 rounded-xl transition-all duration-200 group"
          >
            <Image
              src="brain.svg"
              alt="AI Brain Logo"
              className="w-10 h-10 transition-all  brightness-0 invert  "
              style={{
                filter: 'brightness(0) invert(1)',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(0) saturate(100%) invert(47%) sepia(69%) saturate(6010%) hue-rotate(194deg) brightness(101%) contrast(101%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(0) invert(1)';
              }}
            />
          </Link>
          <div className="flex items-center flex-col gap-y-4 w-full">
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className={`relative flex flex-row items-center cursor-pointer hover:text-[#24A0ED] duration-150 transition w-full py-2 rounded-lg
                  ${link.active ? "text-[#24A0ED]" : "text-white/70"}
                `}
              >
                <link.icon className="text-white hover:text-[#24A0ED] w-full" />

                {link.active && (
                  <div className="absolute right-0 -mr-2 h-full w-1 rounded-l-lg bg-[#24A0ED]" />
                )}
              </Link>
            ))}
          </div>
          <Link
            href="/"
            className="flex flex-col item-center text-center justify-between"
          >
            <CircleAlert className="text-white hover:text-[#24A0ED]" />
          </Link>
        </div>
      </div>
      <div className="fixed bottom-0 flex flex-row w-full z-50 items-center gap-x-6 bg-[#111111] px-4 py-4 shadow-sm lg:hidden">
        {navLinks.map((link, i) => (
          <Link
            key={i}
            href={link.href}
            className={`relative flex flex-col items-center space-y-1 text-center w-full hover:text-[#24A0ED]
              ${link.active ? "text-white" : "text-white/70"}
            `}
          >
            {link.active && (
              <div className="absolute top-0 -mt-4 w-full h-1 rounded-l-lg bg-[#24A0ED]" />
            )}
            <link.icon/>
            <span className="text-xm">{link.label}</span>
          </Link>
        ))}
      </div>
      <Layout>{children}</Layout>
    </div>
  );
};

export default Sidebar;
