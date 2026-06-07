"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { NotificationBell } from "@/components/ui/Notifications";
import { GlobalSearch }     from "@/components/ui/GlobalSearch";
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
  BookOpen,
  Briefcase,
  Dumbbell,
  Moon,
  Sun,
  Library,
  Ruler,
  Pill,
  Heart,
} from "lucide-react";

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    setDark(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }
  return { dark, toggle };
}

interface NavItem {
  label:  string;
  href:   string;
  icon:   React.ElementType;
  badge?: string | null;
}

interface NavSection {
  label: string;
  items: NavItem[];
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
  const { dark, toggle } = useDarkMode();

  const navigation: NavSection[] = [
    {
      label: "Core",
      items: [
        { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
        { label: "Tasks",      href: "/tasks",       icon: CheckSquare, badge: dueToday != null ? String(dueToday) : null },
        { label: "Analytics",  href: "/analytics",   icon: BarChart2 },
      ],
    },
    {
      label: "Wellbeing",
      items: [
        { label: "Habits",       href: "/habits",       icon: Activity },
        { label: "Health",       href: "/health",       icon: Layers },
        { label: "Fitness",      href: "/fitness",      icon: Dumbbell },
        { label: "Body",         href: "/body",         icon: Ruler },
        { label: "Supplements",  href: "/supplements",  icon: Pill },
        { label: "Cycle",        href: "/period",       icon: Heart },
        { label: "Books",         href: "/books",        icon: Library },
        { label: "Journal",      href: "/journal",      icon: BookOpen },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Work",      href: "/work",      icon: Briefcase },
        { label: "Finance",   href: "/finance",   icon: DollarSign },
        { label: "Capture",   href: "/capture",   icon: MessageCircle },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { label: "AI Memory", href: "/memory", icon: Brain },
      ],
    },
  ];

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  return (
    <>
    <aside className="flex flex-col h-full" style={{ minHeight: "100dvh" }}>

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1.5" fill="white"/>
            <rect x="9" y="2" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.6)"/>
            <rect x="2" y="9" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.6)"/>
            <rect x="9" y="9" width="5" height="5" rx="1.5" fill="rgba(255,255,255,0.4)"/>
          </svg>
        </div>
        <div>
          <div className="sidebar-logo-text">Personal OS</div>
          <div className="sidebar-logo-sub">Your life dashboard</div>
        </div>
      </div>

      {/* Search trigger */}
      <div style={{ padding: "0 12px 8px" }}>
        <button className="sidebar-search-btn" onClick={() => {
          const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
          window.dispatchEvent(e);
        }}>
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span>Search…</span>
          <kbd style={{ marginLeft: "auto", fontSize: 10, color: "#B0BAD8", background: "#ECEEF8", padding: "1px 5px", borderRadius: 4 }}>⌘K</kbd>
        </button>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navigation.map((section) => (
          <div key={section.label} className="sidebar-section">
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} className={`sidebar-nav-item${active ? " active" : ""}`}>
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-nav-badge">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Notifications */}
      <div style={{ padding: "0 12px 6px" }}>
        <NotificationBell />
      </div>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <Link href="/settings" className={`sidebar-nav-item${isActive("/settings") ? " active" : ""}`}>
          <Settings size={16} style={{ flexShrink: 0 }} />
          <span>Settings</span>
        </Link>
        <button className="sidebar-nav-item" onClick={toggle} style={{ marginTop: 2 }}>
          {dark ? <Sun size={16} style={{ flexShrink: 0 }} /> : <Moon size={16} style={{ flexShrink: 0 }} />}
          <span>{dark ? "Light mode" : "Dark mode"}</span>
        </button>
        <div className="sidebar-user" style={{ marginTop: 4 }}>
          <div className="sidebar-avatar">A</div>
          <div>
            <div className="sidebar-user-name">Agneta</div>
            <div className="sidebar-user-role">Team Lead</div>
          </div>
        </div>
      </div>

    </aside>

    {/* Search modal — mounted outside aside so it can cover full screen */}
    <GlobalSearch />
  </>
  );
}
