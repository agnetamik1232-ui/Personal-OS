"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OPERATOR } from "@/lib/config/operator";

const TABS = [
  { label: "Home",     href: "/dashboard" },
  { label: "Tasks",    href: "/tasks"     },
  { label: "Habits",   href: "/habits"    },
  { label: "Health",   href: "/health"    },
  { label: "Fitness",  href: "/fitness"   },
  { label: "Journal",  href: "/journal"   },
  { label: "Work",     href: "/work"      },
  { label: "Finance",  href: "/finance"   },
  { label: "Review",   href: "/analytics" },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const activeLabel = TABS.find((t) =>
    t.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(t.href)
  )?.label ?? "Personal OS";

  return (
    <>
      {/* Hamburger button — shown only on mobile via CSS */}
      <div className="mobile-nav-bar">
        <Link href="/dashboard" className="mobile-nav-brand" aria-label="Home">
          <div className="mobile-nav-brand-mark">P</div>
          <span className="mobile-nav-brand-name">{activeLabel}</span>
        </Link>
        <button
          className="mobile-hamburger"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`mobile-drawer${open ? " mobile-drawer-open" : ""}`}
        aria-label="Navigation menu"
        role="navigation"
      >
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand">
            <div className="mobile-nav-brand-mark">P</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--cream)" }}>
              Personal OS
            </span>
          </div>
          <button
            className="mobile-drawer-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="mobile-drawer-nav">
          {TABS.map((tab) => {
            const isActive =
              tab.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`mobile-drawer-link${isActive ? " mobile-drawer-link-active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="mobile-drawer-footer">
          <div className="mobile-drawer-user">
            <div className="mobile-drawer-avatar">
              {OPERATOR.name.slice(0, 2).toUpperCase()}
            </div>
            <span className="mobile-drawer-username">{OPERATOR.name}</span>
          </div>
        </div>
      </div>
    </>
  );
}
