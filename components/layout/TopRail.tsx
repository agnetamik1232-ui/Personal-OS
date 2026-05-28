"use client";

import { useState, useEffect } from "react";
import { IconSearch } from "@/components/ui/Icon";

const TABS = ["Home", "CRM", "Brain", "Finance", "Journal", "Health"] as const;
type Tab = (typeof TABS)[number];

export function TopRail() {
  const [active, setActive] = useState<Tab>("Home");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="rail-wrap">
      <header className="rail">
        {/* Brand */}
        <div className="rail-brand">
          <div className="rail-brand-mark">P</div>
          <div>
            <div className="rail-brand-name">Personal OS</div>
            <div className="rail-brand-sub">v1.0 · live</div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="rail-tabs" aria-label="Main navigation">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`rail-tab${active === tab ? " is-active" : ""}`}
              onClick={() => setActive(tab)}
            >
              {tab}
            </button>
          ))}
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

          <button className="rail-avatar" aria-label="User menu">AG</button>
        </div>
      </header>
    </div>
  );
}
