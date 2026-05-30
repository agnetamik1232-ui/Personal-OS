"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckInModal } from "@/components/checkin/CheckInModal";

const ACTIONS = [
  { icon: "✅", label: "Task",    href: "/tasks"   },
  { icon: "🕐", label: "Shift",   href: "/work"    },
  { icon: "💸", label: "Expense", href: "/finance" },
  { icon: "📝", label: "Journal", href: "/journal" },
  { icon: "🎯", label: "Goal",    href: "/goals"   },
];

export function QuickActionsBar() {
  const [showCheckin, setShowCheckin] = useState(false);

  return (
    <>
      <div className="qa2-bar">
        <div className="qa2-inner">
          <button type="button" className="qa2-checkin" onClick={() => setShowCheckin(true)}>
            <span>💬</span> Check-In
          </button>
          <div className="qa2-divider" />
          {ACTIONS.map(a => (
            <Link key={a.href} href={a.href} className="qa2-item">
              <span>{a.icon}</span>
              <span className="qa2-label">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {showCheckin && (
        <CheckInModal
          existing={null}
          onClose={() => setShowCheckin(false)}
          onSaved={() => setShowCheckin(false)}
        />
      )}
    </>
  );
}
