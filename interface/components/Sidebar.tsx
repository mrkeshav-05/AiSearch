"use client";

import { SquareIcon, Home, Search, BookOpenText, Link, CircleAlert } from "lucide-react";
import { useSelectedLayoutSegments } from "next/navigation";
import Layout from "./Layout";
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
          <a href="/" title="Home">
            <SquareIcon className="text-white cursor-pointer" />
            <span className="sr-only">Home</span>
          </a>
          <div className="flex items-center flex-col gap-y-3 w-full">
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className={`relative flex flex-row items-center cursor-pointer hover:bg-white/10 hover:text-white duration-150 transition w-full py-2 rounded-lg
                  ${link.active ? "text-white" : "text-white/70" }
                `}
              >
                <link.icon className="text-white" />
                {link.active && (
                  <div className="absolute right-0 -mr-2 h-full w-1 rounded-l-lg bg-white" />
                )}
              </Link>
            ))}
          </div>
          <Link href="/" className="flex flex-col item-center text-center justify-between">
            <CircleAlert className="text-white" />
          </Link>
        </div>
      </div>
      <Layout>{children}</Layout>
    </div>
  );
};

export default Sidebar;
