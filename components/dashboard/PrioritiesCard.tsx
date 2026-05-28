"use client";

import { useState } from "react";
import { IconFlag, IconCheck } from "@/components/ui/Icon";

interface PriorityItem {
  label: string;
  sub: string;
  tag: string;
  due: string;
  done: boolean;
}

const INITIAL: PriorityItem[] = [
  { label: "Finalise Q3 memo · second draft",  sub: "Brain · 2 attachments",    tag: "Deep",  due: "12:00", done: false },
  { label: "Call Marcus — investor intro",      sub: "CRM · prep notes ready",   tag: "Meet",  due: "14:30", done: false },
  { label: "Approve July payroll run",          sub: "Finance · review 4 items", tag: "Admin", due: "17:00", done: false },
  { label: "Daily journal entry",               sub: "Journal · 3-min prompt",   tag: "Self",  due: "21:00", done: false },
  { label: "Morning workout — push day",        sub: "Health · 45 min",          tag: "Body",  due: "done",  done: true  },
];

export function PrioritiesCard() {
  const [items, setItems] = useState<PriorityItem[]>(INITIAL);

  function toggle(i: number) {
    setItems((prev) =>
      prev.map((it, j) => (j === i ? { ...it, done: !it.done } : it))
    );
  }

  const doneCount = items.filter((it) => it.done).length;

  return (
    <div className="card card-olive">
      <svg className="card-deco" style={{ right: -28, top: -28, width: 130, height: 130 }} viewBox="0 0 100 100" aria-hidden>
        <rect x="0" y="0" width="100" height="100" rx="22" fill="rgba(28,26,23,0.04)" transform="rotate(15 50 50)"/>
      </svg>

      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconFlag size={12} /> Today&apos;s Priorities</div>
          <h3 className="card-title">{items.length} tracked · {doneCount} done</h3>
        </div>
        <button className="card-action">+ Add</button>
      </div>

      <div className="priorities">
        {items.map((it, i) => (
          <div className={`priority${it.done ? " priority-done" : ""}`} key={it.label}>
            <button
              className="priority-check"
              onClick={() => toggle(i)}
              aria-label={`${it.done ? "Uncheck" : "Complete"} ${it.label}`}
              aria-pressed={it.done}
            >
              {it.done && <IconCheck size={12} />}
            </button>
            <div className="priority-label">
              {it.label}
              <span className="priority-sub">{it.sub}</span>
            </div>
            <span className="priority-tag">{it.tag}</span>
            <span className="priority-due">{it.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
