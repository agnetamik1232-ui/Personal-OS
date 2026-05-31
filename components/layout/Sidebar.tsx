"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Activity,
  DollarSign,
  MessageCircle,
  BarChart2,
  Brain,
  Settings,
  Layers,
  ChevronRight,
  BookOpen,
  Briefcase,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavSection {
  label: string;
  items: NavItem[];
}

interface NavItem {
  label:  string;
  href:   string;
  icon:   React.ElementType;
  badge?: string | null;
}

function useDueTodayCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]!;
    fetch("/api/tasks?status=open&limit=200")
      .then((r) => r.json() as Promise<{ tasks?: { due_date: string | null }[] }>)
      .then((j) => {
        const due = (j.tasks ?? []).filter((t) => t.due_date && t.due_date <= today).length;
        setCount(due > 0 ? due : null);
      })
      .catch(() => setCount(null));
  }, []);
  return count;
}

export function Sidebar() {
  const pathname  = usePathname();
  const dueToday  = useDueTodayCount();

  const navigation: NavSection[] = [
    {
      label: "Core",
      items: [
        { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
        { label: "Tasks",      href: "/tasks",       icon: CheckSquare,    badge: dueToday != null ? String(dueToday) : null },
        { label: "Analytics",  href: "/analytics",   icon: BarChart2 },
      ],
    },
    {
      label: "Wellbeing",
      items: [
        { label: "Habits",     href: "/habits",      icon: Activity },
        { label: "Health",     href: "/health",      icon: Layers },
        { label: "Fitness",    href: "/fitness",     icon: Dumbbell },
        { label: "Journal",    href: "/journal",     icon: BookOpen },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Work",       href: "/work",        icon: Briefcase },
        { label: "Finance",    href: "/finance",     icon: DollarSign },
        { label: "Workflows",  href: "/workflows",   icon: CheckSquare },
        { label: "Capture",    href: "/capture",     icon: MessageCircle },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { label: "AI Memory",  href: "/memory",      icon: Brain },
      ],
    },
  ];

  return (
    <aside
      className="flex flex-col w-[var(--sidebar-w)] h-full flex-shrink-0"
      style={{ backgroundColor: "oklch(var(--sidebar))" }}
    >
      {/* Logo / wordmark */}
      <div className="flex items-center gap-2.5 px-5 h-[var(--header-h)] flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
          <div className="w-3 h-3 rounded-sm bg-accent" />
        </div>
        <span className="text-sm font-semibold text-sidebar-text tracking-tight">
          Personal OS
        </span>
      </div>

      <div
        className="flex-shrink-0 mx-4"
        style={{ borderBottom: "1px solid oklch(var(--sidebar-border))" }}
      />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scroll-y">
        {navigation.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-2xs font-semibold uppercase tracking-widest text-sidebar-muted">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "nav-item group",
                        isActive && "active"
                      )}
                    >
                      <Icon
                        size={16}
                        className={cn(
                          "nav-icon flex-shrink-0 transition-colors duration-150",
                          isActive
                            ? "text-accent"
                            : "text-sidebar-muted group-hover:text-sidebar-text"
                        )}
                      />
                      <span className="flex-1 text-sidebar-muted group-hover:text-sidebar-text transition-colors duration-150">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="text-2xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom rail */}
      <div
        className="flex-shrink-0 mx-4"
        style={{ borderTop: "1px solid oklch(var(--sidebar-border))" }}
      />
      <div className="p-3">
        <Link
          href="/settings"
          className={cn(
            "nav-item group",
            pathname.startsWith("/settings") && "active"
          )}
        >
          <Settings
            size={16}
            className="text-sidebar-muted group-hover:text-sidebar-text flex-shrink-0 transition-colors duration-150"
          />
          <span className="flex-1 text-sidebar-muted group-hover:text-sidebar-text transition-colors duration-150">
            Settings
          </span>
        </Link>

        {/* User pill */}
        <button className="nav-item w-full mt-1">
          <div className="w-6 h-6 rounded-full bg-accent/25 flex items-center justify-center flex-shrink-0">
            <span className="text-2xs font-bold text-accent">A</span>
          </div>
          <span className="flex-1 text-left text-sidebar-muted text-xs">Agneta</span>
          <ChevronRight size={12} className="text-sidebar-muted" />
        </button>
      </div>
    </aside>
  );
}
