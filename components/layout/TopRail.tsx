"use client";

import { Bell, Search, SunMedium } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TopRailProps {
  className?: string;
}

export function TopRail({ className }: TopRailProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-6 lg:px-8 flex-shrink-0 bg-ink-0 border-b border-ink-2/60",
        className
      )}
      style={{ height: "var(--header-h)" }}
    >
      {/* Left — breadcrumb / search trigger */}
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ink-1 border border-ink-2/60 text-sm text-ink-3 hover:text-ink-4 hover:border-ink-2 transition-all duration-150 group min-w-48">
        <Search size={14} className="text-ink-3 group-hover:text-accent transition-colors duration-150" />
        <span>Search or ask anything…</span>
        <span className="ml-auto font-mono text-xs text-ink-3/60 bg-ink-2/40 px-1 rounded">
          ⌘K
        </span>
      </button>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        <button className="btn-icon btn-ghost text-ink-3" aria-label="Toggle theme">
          <SunMedium size={16} />
        </button>
        <button className="btn-icon btn-ghost text-ink-3 relative" aria-label="Notifications">
          <Bell size={16} />
          {/* Notification dot */}
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent" />
        </button>
      </div>
    </header>
  );
}
