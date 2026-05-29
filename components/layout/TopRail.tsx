"use client";

import { useEffect, useState }  from "react";
import { usePathname }           from "next/navigation";
import Link                      from "next/link";
import { IconSearch }            from "@/components/ui/Icon";
import { OPERATOR }              from "@/lib/config/operator";

const TABS = [
  { label: "Home",     href: "/dashboard" },
  { label: "Tasks",    href: "/tasks"     },
  { label: "Habits",   href: "/habits"    },
  { label: "Health",   href: "/health"    },
  { label: "Journal",  href: "/journal"   },
  { label: "Work",     href: "/work"      },
  { label: "Finance",  href: "/finance"   },
  { label: "CRM",      href: "/crm"       },
  { label: "Review",   href: "/analytics" },
] as const;

export function TopRail() {
  const pathname = usePathname();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const tz   = OPERATOR.timezone;
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(now);
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "short", month: "short", day: "numeric", timeZone: tz }).format(now);

  // Derive initials from operator name
  const initials = OPERATOR.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rail-wrap">
      <header className="rail">
        {/* Brand */}
        <Link href="/dashboard" className="rail-brand" aria-label="Dashboard home">
          <div className="rail-brand-mark">P</div>
          <div>
            <div className="rail-brand-name">Personal OS</div>
            <div className="rail-brand-sub">v1.0 · live</div>
          </div>
        </Link>

        {/* Nav tabs */}
        <nav className="rail-tabs" aria-label="Main navigation">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href ||
              (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rail-tab${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="rail-right">
          <button className="rail-search" aria-label="Search">
            <IconSearch size={13} />
            <span>Ask anything</span>
            <span className="kbd">⌘K</span>
          </button>

          <div className="rail-datetime" aria-label="Current time">
            <div className="rail-time">{time}</div>
            <div className="rail-date">{date}</div>
          </div>

          <button className="rail-avatar" aria-label="User menu" title={OPERATOR.name}>
            {initials}
          </button>
        </div>
      </header>
    </div>
  );
}
