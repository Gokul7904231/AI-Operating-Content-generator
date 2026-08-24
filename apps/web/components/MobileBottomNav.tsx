"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Share2, Settings } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { useOSStore } from "@/lib/os-store";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/media/library", label: "Videos", icon: Film },
  { href: "/publishing/youtube", label: "Publish", icon: Share2 },
  { href: "/settings", label: "Account", icon: Settings },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const setOpen = useOSStore((s) => s.setQuickGenerateOpen);

  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around gap-1 border-t border-black/[0.06] dark:border-white/[0.08] bg-white/95 dark:bg-[#050A12]/95 backdrop-blur-md px-2 py-2 md:hidden safe-area-pb"
      aria-label="Primary mobile navigation"
    >
      <Link
        href="/dashboard"
        className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-bold ${pathname === "/dashboard" ? "text-[#1677FF] bg-[#1677FF]/10" : "text-[#667085] dark:text-[#A8B2C1]"}`}
      >
        <Home className="h-5 w-5" />
        <span>Home</span>
      </Link>

      <button
        data-testid="mobile-create-fab"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-2xl bg-[#1677FF] px-4 py-2 text-white shadow-md active:scale-[0.98] transition-transform cursor-pointer"
        aria-label="Create Video"
      >
        <BrandIcon className="h-5 w-5" variant="white" />
        <span className="text-[10px] font-bold">Create</span>
      </button>

      {NAV.slice(1).map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-bold ${active ? "text-[#1677FF] bg-[#1677FF]/10" : "text-[#667085] dark:text-[#A8B2C1]"}`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
