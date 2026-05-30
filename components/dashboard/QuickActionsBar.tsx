"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckInModal } from "@/components/checkin/CheckInModal";
import type { DailyCheckin } from "@/lib/checkin/types";

const ACTIONS = [
  { icon: "✅", label: "Task",    href: "/tasks?add=1"   },
  { icon: "💸", label: "Expense", href: "/finance?add=1" },
  { icon: "🕐", label: "Shift",   href: "/work?add=1"    },
  { icon: "📝", label: "Journal", href: "/journal"       },
  { icon: "🎯", label: "Goal",    href: "/goals?add=1"   },
];

export function QuickActionsBar() {
  const [showCheckin, setShowCheckin] = useState(false);

  function onSaved(_c: DailyCheckin) {
    setShowCheckin(false);
  }

  return (
    <>
      <div className="qa-bar">
        <button
          type="button"
          className="qa-item qa-checkin"
          onClick={() => setShowCheckin(true)}
          aria-label="Daily Check-In"
        >
          <span className="qa-icon">💬</span>
          <span className="qa-label">Check-In</span>
        </button>

        {ACTIONS.map(a => (
          <Link key={a.href} href={a.href} className="qa-item">
            <span className="qa-icon">{a.icon}</span>
            <span className="qa-label">{a.label}</span>
          </Link>
        ))}
      </div>

      {showCheckin && (
        <CheckInModal
          existing={null}
          onClose={() => setShowCheckin(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
