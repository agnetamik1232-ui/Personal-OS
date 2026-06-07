"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TrackingItem {
  id:       string;
  icon:     string;
  label:    string;
  detail:   string;
  done:     boolean;
  href:     string;
  priority: 1 | 2 | 3;  // 1 = most important, 3 = nice to have
}

function todayWorkoutLabel(): string | null {
  const d = new Date().getDay();
  const map: Record<number, string> = { 1:"Day A — Lower", 3:"Day B — Upper", 5:"Day C — Full Body" };
  return map[d] ?? null;
}

export function DailyTrackingCard() {
  const [items, setItems]   = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0]!;
      const dow   = new Date().getDay();
      const trainingDay = todayWorkoutLabel();

      const [habits, supps, nutr, fit, body, checkin, period, books] = await Promise.all([
        fetch("/api/habits?days=1").then(r => r.json()).catch(() => ({})),
        fetch("/api/supplements").then(r => r.json()).catch(() => ({})),
        fetch(`/api/nutrition?days=1`).then(r => r.json()).catch(() => ({})),
        fetch("/api/fitness/logs?days=1").then(r => r.json()).catch(() => ({})),
        fetch("/api/body?days=7").then(r => r.json()).catch(() => ({})),
        fetch(`/api/checkin?date=${today}`).then(r => r.json()).catch(() => ({})),
        fetch("/api/period?days=7").then(r => r.json()).catch(() => ({})),
        fetch("/api/books?status=reading").then(r => r.json()).catch(() => ({})),
      ]);

      const habLog   = (habits as { logs?: Record<string, { done: string[] }> }).logs?.[today];
      const suppArr  = (supps as { supplements?: { taken: boolean; timing: string }[] }).supplements ?? [];
      const dayLog   = (nutr as { logs?: Record<string, { meals: unknown[]; kcal: number; p: number }> }).logs?.[today];
      const fitLogs  = (fit as { logs?: { log_date: string }[] }).logs ?? [];
      const bodyArr  = (body as { measurements?: { log_date: string }[] }).measurements ?? [];
      const checkRow = (checkin as { checkin?: unknown | null }).checkin;
      const periodArr = (period as { logs?: { log_date: string }[] }).logs ?? [];
      const readingBooks = (books as { books?: { current_page: number; updated_at: string }[] }).books ?? [];

      // Compute booleans
      const didCheckin    = !!checkRow;
      const didWorkout    = fitLogs.some(l => l.log_date === today);
      const hadMeal       = (dayLog?.meals?.length ?? 0) > 0;
      const proteinDone   = (dayLog?.p ?? 0) >= 150;
      const allSuppsDone  = suppArr.length > 0 && suppArr.every(s => s.taken);
      const habitsDone    = (habLog?.done.length ?? 0) >= 4;
      const weighedToday  = bodyArr.some(b => b.log_date === today);
      const weighedThisWk = bodyArr.length > 0;
      const periodToday   = periodArr.some(p => p.log_date === today);
      const readToday     = readingBooks.some(b => b.updated_at.split("T")[0] === today);

      const list: TrackingItem[] = [];

      // 1. Daily check-in (always priority 1 if not done)
      if (!didCheckin) {
        list.push({ id:"checkin", icon:"💭", label:"Daily check-in", detail:"Mood, sleep, energy", done:false, href:"/health", priority:1 });
      } else {
        list.push({ id:"checkin", icon:"💭", label:"Daily check-in", detail:"Completed today", done:true, href:"/health", priority:3 });
      }

      // 2. Workout (only on training days, top priority)
      if (trainingDay) {
        list.push({ id:"workout", icon:"🏋️", label:`Workout: ${trainingDay}`, detail:didWorkout ? "Logged" : "Log your sets", done:didWorkout, href:"/fitness", priority:1 });
      }

      // 3. Weight (Monday morning is best — or once a week minimum)
      if (dow === 1 && !weighedToday) {
        list.push({ id:"weight", icon:"⚖️", label:"Weigh in", detail:"Mondays = best day", done:false, href:"/body", priority:1 });
      } else if (!weighedThisWk) {
        list.push({ id:"weight", icon:"⚖️", label:"Weigh in", detail:"None this week", done:false, href:"/body", priority:2 });
      }

      // 4. Meals (priority 1 always)
      list.push({ id:"meals", icon:"🍽️", label:"Log meals", detail:hadMeal ? `${Math.round(dayLog?.kcal ?? 0)} kcal · ${Math.round(dayLog?.p ?? 0)}g protein` : "Nothing logged yet", done:hadMeal, href:"/meals", priority:1 });

      // 5. Protein goal (separate check)
      if (hadMeal && !proteinDone) {
        const gap = 163 - Math.round(dayLog?.p ?? 0);
        list.push({ id:"protein", icon:"🥩", label:"Protein target", detail:`${gap}g still needed`, done:false, href:"/health", priority:1 });
      }

      // 6. Supplements
      if (suppArr.length > 0) {
        const takenCount = suppArr.filter(s => s.taken).length;
        list.push({ id:"supps", icon:"💊", label:"Supplements", detail:allSuppsDone ? "All taken ✓" : `${takenCount} / ${suppArr.length} taken`, done:allSuppsDone, href:"/supplements", priority:2 });
      }

      // 7. Habits (4+ done is "good")
      const habCount = habLog?.done.length ?? 0;
      list.push({ id:"habits", icon:"🔥", label:"Daily habits", detail:`${habCount} / 6 completed`, done:habitsDone, href:"/habits", priority:2 });

      // 8. Period log (only show if no log in last 7 days OR if it's been irregular)
      if (periodArr.length === 0) {
        list.push({ id:"period", icon:"🩷", label:"Cycle log", detail:"No entries yet", done:false, href:"/period", priority:3 });
      } else if (!periodToday && periodArr.length < 7) {
        list.push({ id:"period", icon:"🩷", label:"Cycle log", detail:"Track symptoms today", done:false, href:"/period", priority:3 });
      }

      // 9. Read (if has reading books)
      if (readingBooks.length > 0) {
        list.push({ id:"read", icon:"📖", label:"Read", detail:readToday ? "Progress saved today" : `${readingBooks.length} book${readingBooks.length>1?"s":""} in progress`, done:readToday, href:"/books", priority:3 });
      }

      // Sort: undone first by priority, done last
      list.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.priority - b.priority;
      });

      setItems(list);
      setLoading(false);
    }
    void load();
  }, []);

  if (loading) return <div className="dt-card card"><div className="dt-loading">Loading…</div></div>;

  const doneCount = items.filter(i => i.done).length;
  const total     = items.length;
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const visible   = collapsed ? items.filter(i => !i.done) : items;
  const allDone   = doneCount === total && total > 0;

  return (
    <div className={`dt-card card${allDone ? " all-done" : ""}`}>
      <div className="dt-header">
        <div>
          <div className="card-eyebrow">✅ Today&apos;s Tracking</div>
          <div className="dt-summary">
            {allDone ? "🎉 All caught up!" : `${doneCount} of ${total} tracked · ${pct}%`}
          </div>
        </div>
        <button className="dt-toggle" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? "Show all" : "Hide done"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="dt-progress-bar"><div className="dt-progress-fill" style={{ width: `${pct}%` }} /></div>

      {/* Items */}
      <div className="dt-items">
        {visible.length === 0 ? (
          <p className="dt-empty">🎉 Everything tracked for today!</p>
        ) : visible.map(item => (
          <Link key={item.id} href={item.href} className={`dt-item${item.done ? " done" : ""} dt-prio-${item.priority}`}>
            <span className="dt-item-check">{item.done ? "✓" : "○"}</span>
            <span className="dt-item-icon">{item.icon}</span>
            <div className="dt-item-body">
              <div className="dt-item-label">{item.label}</div>
              <div className="dt-item-detail">{item.detail}</div>
            </div>
            {!item.done && <span className="dt-item-arrow">→</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
