"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen, Flame, Trophy, Lightbulb, Clock, Search,
  Plus, X, ChevronRight, Star, TrendingUp, Calendar,
  Smile, Zap, Brain, Target, BarChart2, Heart,
} from "lucide-react";
import {
  MOOD_EMOJI, MOOD_LABEL, QUICK_TAGS, GUIDED_PROMPTS,
  LIFE_AREA_LABELS,
} from "@/lib/journal/types";
import type {
  JournalEntry, JournalWin, JournalLesson, JournalStats,
  MoodLevel, ScoreLevel, LifeArea, PromptKey,
} from "@/lib/journal/types";

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDate(key: string, opts?: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Vilnius",
    ...opts ?? { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
function fmtShort(key: string): string {
  return fmtDate(key, { day: "numeric", month: "short" });
}
function daysAgo(key: string): number {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return Math.round((Date.now() - Date.UTC(y, m - 1, d)) / 86400000);
}
function dateMinusDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d - days));
  return dt.toISOString().split("T")[0]!;
}
function scoreColor(n: number): string {
  if (n >= 8) return "#2E6B45";
  if (n >= 6) return "#3B82F6";
  if (n >= 4) return "#F97316";
  return "#DC2626";
}

type View = "dashboard" | "today" | "timeline" | "wins" | "lessons" | "stats" | "search";

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScorePicker({ value, onChange }: { value: ScoreLevel | null; onChange: (v: ScoreLevel) => void }) {
  return (
    <div className="rflx-score-row">
      {Array.from({ length: 10 }, (_, i) => {
        const v = (i + 1) as ScoreLevel;
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`rflx-score-btn${value === v ? " rflx-score-active" : ""}`}
            style={value === v ? { background: scoreColor(v), color: "#fff", borderColor: scoreColor(v) } : undefined}>
            {v}
          </button>
        );
      })}
    </div>
  );
}

function MoodPicker({ label, value, onChange, emoji = false }: {
  label: string; value: MoodLevel | null; onChange: (v: MoodLevel) => void; emoji?: boolean;
}) {
  return (
    <div className="rflx-level-row">
      <span className="rflx-level-label">{label}</span>
      <div className="rflx-level-btns">
        {([1, 2, 3, 4, 5] as MoodLevel[]).map(v => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`rflx-level-btn${value === v ? " rflx-level-active" : ""}`}>
            {emoji ? MOOD_EMOJI[v] : v}
          </button>
        ))}
        {value !== null && !emoji && <span className="rflx-level-hint">{MOOD_EMOJI[value]} {MOOD_LABEL[value]}</span>}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function JournalPage() {
  const today = todayKey();
  const [view, setView]                     = useState<View>("dashboard");
  const [entries, setEntries]               = useState<JournalEntry[]>([]);
  const [todayEntry, setTodayEntry]         = useState<JournalEntry | null>(null);
  const [wins, setWins]                     = useState<JournalWin[]>([]);
  const [lessons, setLessons]               = useState<JournalLesson[]>([]);
  const [stats, setStats]                   = useState<JournalStats | null>(null);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchMood, setSearchMood]         = useState<MoodLevel | null>(null);
  const [searchTag, setSearchTag]           = useState("");
  const [selectedEntry, setSelectedEntry]   = useState<JournalEntry | null>(null);
  const [addingWin, setAddingWin]           = useState(false);
  const [addingLesson, setAddingLesson]     = useState(false);
  const [newWinTitle, setNewWinTitle]       = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [activePrompt, setActivePrompt]     = useState<PromptKey | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [draft, setDraft] = useState<Partial<JournalEntry>>({
    date: today, content: "", prompts: {}, tags: [], gratitude: [],
    mood: null, energy: null, stress: null, focus: null,
    title: null,
  });

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [eRes, wRes, lRes, sRes] = await Promise.all([
      fetch("/api/journal/entries?limit=90").then(r => r.json() as Promise<{ entries?: JournalEntry[] }>),
      fetch("/api/journal/wins").then(r => r.json() as Promise<{ wins?: JournalWin[] }>),
      fetch("/api/journal/lessons").then(r => r.json() as Promise<{ lessons?: JournalLesson[] }>),
      fetch("/api/journal/stats").then(r => r.json() as Promise<{ stats?: JournalStats }>),
    ]);
    const allEntries = eRes.entries ?? [];
    setEntries(allEntries);
    setWins(wRes.wins ?? []);
    setLessons(lRes.lessons ?? []);
    setStats(sRes.stats ?? null);
    const te = allEntries.find(e => e.date === today) ?? null;
    setTodayEntry(te);
    if (te) setDraft({ ...te });
    setLoading(false);
  }, [today]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // ── Auto-save ───────────────────────────────────────────────────────────────
  const saveDraft = useCallback(async (d: Partial<JournalEntry>) => {
    setSaving(true);
    const res = await fetch("/api/journal/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, date: today }),
    }).then(r => r.json() as Promise<{ entry?: JournalEntry }>);
    setSaving(false);
    if (res.entry) {
      setTodayEntry(res.entry);
      setEntries(prev => {
        const idx = prev.findIndex(e => e.date === today);
        return idx >= 0 ? [res.entry!, ...prev.filter(e => e.date !== today)] : [res.entry!, ...prev];
      });
    }
  }, [today]);

  function updateDraft(patch: Partial<JournalEntry>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveDraft(next); }, 1400);
  }

  function toggleTag(tag: string) {
    const tags = draft.tags ?? [];
    updateDraft({ tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag] });
  }

  function setGratitude(idx: number, val: string) {
    const g = [...(draft.gratitude ?? ["", "", ""])];
    while (g.length < 3) g.push("");
    g[idx] = val;
    updateDraft({ gratitude: g });
  }

  function setPromptVal(key: PromptKey, val: string) {
    updateDraft({ prompts: { ...(draft.prompts ?? {}), [key]: val } });
  }

  async function addWin() {
    if (!newWinTitle.trim()) return;
    const res = await fetch("/api/journal/wins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newWinTitle }),
    }).then(r => r.json() as Promise<{ win?: JournalWin }>);
    if (res.win) setWins(prev => [res.win!, ...prev]);
    setNewWinTitle(""); setAddingWin(false);
  }

  async function deleteWin(id: string) {
    await fetch(`/api/journal/wins?id=${id}`, { method: "DELETE" });
    setWins(prev => prev.filter(w => w.id !== id));
  }

  async function addLesson() {
    if (!newLessonTitle.trim()) return;
    const res = await fetch("/api/journal/lessons", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newLessonTitle }),
    }).then(r => r.json() as Promise<{ lesson?: JournalLesson }>);
    if (res.lesson) setLessons(prev => [res.lesson!, ...prev]);
    setNewLessonTitle(""); setAddingLesson(false);
  }

  async function deleteLesson(id: string) {
    await fetch(`/api/journal/lessons?id=${id}`, { method: "DELETE" });
    setLessons(prev => prev.filter(l => l.id !== id));
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  const searchResults = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchText = !q || e.content.toLowerCase().includes(q)
      || (e.title ?? "").toLowerCase().includes(q)
      || Object.values(e.prompts ?? {}).some(v => (v ?? "").toLowerCase().includes(q));
    const matchMood = !searchMood || e.mood === searchMood;
    const matchTag  = !searchTag  || (e.tags ?? []).includes(searchTag);
    return matchText && matchMood && matchTag;
  });

  // ── On This Day ─────────────────────────────────────────────────────────────
  const onThisDay = ([30, 180, 365] as const).map(days => ({
    days, label: days === 30 ? "1 Month Ago" : days === 180 ? "6 Months Ago" : "1 Year Ago",
    entry: entries.find(e => e.date === dateMinusDays(today, days)),
  })).filter(x => x.entry !== undefined);

  // ── Insights ────────────────────────────────────────────────────────────────
  const insights = ((): string[] => {
    if (entries.length < 5) return [];
    const out: string[] = [];
    const recent = entries.slice(0, 30);
    const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const dayScores: Record<number, number[]> = {};
    for (const e of recent) {
      if (e.score_productivity) {
        const [y, m, d] = e.date.split("-").map(Number) as [number, number, number];
        const dow = new Date(Date.UTC(y, m - 1, d)).getDay();
        if (!dayScores[dow]) dayScores[dow] = [];
        dayScores[dow]!.push(e.score_productivity);
      }
    }
    const bestDay = Object.entries(dayScores)
      .map(([k, vs]) => ({ day: parseInt(k), avg: vs.reduce((a, b) => a + b, 0) / vs.length }))
      .sort((a, b) => b.avg - a.avg)[0];
    if (bestDay && bestDay.avg > 6) out.push(`You tend to be most productive on ${dayNames[bestDay.day]}s.`);
    const last7 = recent.slice(0, 7).filter(e => e.mood !== null);
    const prev7 = recent.slice(7, 14).filter(e => e.mood !== null);
    if (last7.length >= 3 && prev7.length >= 3) {
      const avg = (arr: JournalEntry[]) => arr.reduce((s, e) => s + (e.mood ?? 0), 0) / arr.length;
      const diff = avg(last7) - avg(prev7);
      if (diff > 0.5) out.push("Your mood has been improving over the last week.");
      else if (diff < -0.5) out.push("Your mood has dipped recently. Consider some self-care.");
    }
    const withWorkout    = recent.filter(e => (e.tags ?? []).includes("Workout") && e.mood !== null);
    const withoutWorkout = recent.filter(e => !(e.tags ?? []).includes("Workout") && e.mood !== null);
    if (withWorkout.length >= 2 && withoutWorkout.length >= 2) {
      const wAvg  = withWorkout.reduce((s, e)    => s + (e.mood ?? 0), 0) / withWorkout.length;
      const woAvg = withoutWorkout.reduce((s, e) => s + (e.mood ?? 0), 0) / withoutWorkout.length;
      if (wAvg > woAvg + 0.4) out.push("Your mood scores are higher on days you work out.");
    }
    if ((stats?.streak ?? 0) >= 7) out.push(`Impressive — you're on a ${stats!.streak}-day writing streak!`);
    if (stats?.avgOverall !== null && stats?.avgOverall !== undefined && stats.avgOverall >= 8) {
      out.push("You're consistently rating your days very highly. Great momentum.");
    }
    return out.slice(0, 4);
  })();

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <div className="rflx-loading">Loading your reflection space…</div>;

  const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Home",     icon: <BookOpen size={14} /> },
    { id: "today",     label: "Today",    icon: <Star size={14} /> },
    { id: "timeline",  label: "Timeline", icon: <Clock size={14} /> },
    { id: "wins",      label: "Wins",     icon: <Trophy size={14} /> },
    { id: "lessons",   label: "Lessons",  icon: <Lightbulb size={14} /> },
    { id: "stats",     label: "Stats",    icon: <BarChart2 size={14} /> },
    { id: "search",    label: "Search",   icon: <Search size={14} /> },
  ];

  return (
    <div className="rflx-wrap">
      {/* ── Header ── */}
      <header className="rflx-header">
        <div className="rflx-header-left">
          <div className="rflx-brand">✦ Reflection Center</div>
          <div className="rflx-date-sub">{fmtDate(today)}</div>
        </div>
        <nav className="rflx-nav">
          {NAV.map(n => (
            <button key={n.id} type="button"
              className={`rflx-nav-btn${view === n.id ? " rflx-nav-active" : ""}`}
              onClick={() => setView(n.id)}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
        {saving && <div className="rflx-saving">Saving…</div>}
      </header>

      <main className="rflx-main">

        {/* ═══════════════════════════ DASHBOARD ═══════════════════════════ */}
        {view === "dashboard" && (
          <div className="rflx-dashboard">

            {/* Hero today card */}
            <div className="rflx-hero-card" role="button" tabIndex={0}
              onClick={() => setView("today")}
              onKeyDown={e => e.key === "Enter" && setView("today")}>
              <div className="rflx-hero-left">
                <div className="rflx-hero-eyebrow">Today's Reflection</div>
                <div className="rflx-hero-title">
                  {todayEntry
                    ? (todayEntry.title ?? fmtDate(today, { weekday: "long", day: "numeric", month: "long" }))
                    : "Begin today's reflection"}
                </div>
                {todayEntry?.mood !== null && todayEntry?.mood !== undefined ? (
                  <div className="rflx-hero-mood">
                    {MOOD_EMOJI[todayEntry.mood as MoodLevel]} {MOOD_LABEL[todayEntry.mood as MoodLevel]}
                    {(todayEntry.tags ?? []).length > 0 && (
                      <span className="rflx-hero-tags">
                        {todayEntry.tags.slice(0, 3).map(t => <span key={t} className="rflx-tag">{t}</span>)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="rflx-hero-prompt">"What is one thing that would make today great?"</div>
                )}
              </div>
              <div className="rflx-hero-right">
                {todayEntry?.score_overall !== null && todayEntry?.score_overall !== undefined
                  ? <div className="rflx-hero-score" style={{ color: scoreColor(todayEntry.score_overall) }}>
                      {todayEntry.score_overall}<span>/10</span>
                    </div>
                  : <div className="rflx-hero-arrow"><ChevronRight size={24} /></div>}
              </div>
            </div>

            {/* Stat tiles */}
            <div className="rflx-stat-row">
              {[
                { icon: <Flame size={16} />, val: stats?.streak ?? 0,          label: "Day Streak",     color: "#F97316" },
                { icon: <BookOpen size={16} />, val: stats?.entriesMonth ?? 0, label: "This Month",     color: "#3B82F6" },
                { icon: <Smile size={16} />, val: stats?.avgMood !== null && stats?.avgMood !== undefined ? `${stats.avgMood}/5` : "—", label: "Avg Mood", color: "#2E6B45" },
                { icon: <Target size={16} />, val: stats?.avgOverall !== null && stats?.avgOverall !== undefined ? `${stats.avgOverall}/10` : "—", label: "Avg Day Score", color: "#7C3AED" },
              ].map(s => (
                <div key={s.label} className="rflx-stat-tile">
                  <div className="rflx-stat-icon" style={{ color: s.color }}>{s.icon}</div>
                  <div className="rflx-stat-val">{s.val}</div>
                  <div className="rflx-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="rflx-two-col">
              {/* Recent reflections */}
              <div className="rflx-card">
                <div className="rflx-card-head">
                  <div className="rflx-card-title">Recent Reflections</div>
                  <button type="button" className="rflx-link" onClick={() => setView("timeline")}>View all →</button>
                </div>
                {entries.length === 0
                  ? <div className="rflx-empty">No entries yet. Start your first reflection.</div>
                  : entries.slice(0, 5).map(e => (
                    <div key={e.id} className="rflx-entry-row" role="button" tabIndex={0}
                      onClick={() => { setSelectedEntry(e); setView("timeline"); }}
                      onKeyDown={ev => ev.key === "Enter" && (setSelectedEntry(e), setView("timeline"))}>
                      <div className="rflx-entry-date">{fmtShort(e.date)}</div>
                      <div className="rflx-entry-mood">{e.mood ? MOOD_EMOJI[e.mood as MoodLevel] : "·"}</div>
                      <div className="rflx-entry-preview">{e.title ?? e.content.slice(0, 60)}</div>
                      {e.score_overall !== null && e.score_overall !== undefined &&
                        <div className="rflx-entry-score" style={{ color: scoreColor(e.score_overall) }}>{e.score_overall}</div>}
                    </div>
                  ))}
              </div>

              {/* AI Insights */}
              <div className="rflx-card">
                <div className="rflx-card-head">
                  <div className="rflx-card-title">✦ AI Insights</div>
                </div>
                {insights.length === 0
                  ? <div className="rflx-empty">Write at least 5 entries to unlock insights.</div>
                  : insights.map((ins, i) => (
                    <div key={i} className="rflx-insight-row">
                      <div className="rflx-insight-dot" />
                      <div className="rflx-insight-text">{ins}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* On This Day */}
            {onThisDay.length > 0 && (
              <div className="rflx-card">
                <div className="rflx-card-head">
                  <div className="rflx-card-title"><Calendar size={14} style={{ display: "inline", marginRight: 6 }} />On This Day</div>
                </div>
                <div className="rflx-otd-row">
                  {onThisDay.map(({ days: d, label, entry: e }) => e !== undefined && (
                    <div key={d} className="rflx-otd-card" role="button" tabIndex={0}
                      onClick={() => { setSelectedEntry(e); setView("timeline"); }}
                      onKeyDown={ev => ev.key === "Enter" && (setSelectedEntry(e), setView("timeline"))}>
                      <div className="rflx-otd-label">{label}</div>
                      <div className="rflx-otd-date">{fmtShort(e.date)}</div>
                      <div className="rflx-otd-mood">{e.mood !== null && e.mood !== undefined ? MOOD_EMOJI[e.mood as MoodLevel] : ""}</div>
                      <div className="rflx-otd-preview">{e.title ?? e.content.slice(0, 80)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Wins preview */}
            {wins.length > 0 && (
              <div className="rflx-card">
                <div className="rflx-card-head">
                  <div className="rflx-card-title"><Trophy size={14} style={{ display: "inline", marginRight: 6 }} />Recent Wins</div>
                  <button type="button" className="rflx-link" onClick={() => setView("wins")}>Wins Vault →</button>
                </div>
                <div className="rflx-wins-row">
                  {wins.slice(0, 4).map(w => <div key={w.id} className="rflx-win-chip">🏆 {w.title}</div>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════ TODAY ═══════════════════════════════ */}
        {view === "today" && (
          <div className="rflx-today">
            <div className="rflx-today-head">
              <div>
                <div className="rflx-page-eyebrow">Today's Reflection</div>
                <div className="rflx-page-title">{fmtDate(today)}</div>
              </div>
              <div className="rflx-saving-badge">{saving ? "Saving…" : todayEntry ? "✓ Saved" : ""}</div>
            </div>

            <div className="rflx-today-grid">
              {/* Left */}
              <div className="rflx-today-left">
                <div className="rflx-card">
                  <div className="rflx-card-title rflx-card-title-mb">How are you feeling?</div>
                  <MoodPicker label="Mood"   value={draft.mood   as MoodLevel | null} onChange={v => updateDraft({ mood: v })} emoji />
                  <MoodPicker label="Energy" value={draft.energy as MoodLevel | null} onChange={v => updateDraft({ energy: v })} />
                  <MoodPicker label="Stress" value={draft.stress as MoodLevel | null} onChange={v => updateDraft({ stress: v })} />
                  <MoodPicker label="Focus"  value={draft.focus  as MoodLevel | null} onChange={v => updateDraft({ focus: v })} />
                </div>

                <div className="rflx-card">
                  <div className="rflx-card-title rflx-card-title-sm">Today's Tags</div>
                  <div className="rflx-tags-grid">
                    {QUICK_TAGS.map(t => (
                      <button key={t.label} type="button"
                        className={`rflx-tag-btn${(draft.tags ?? []).includes(t.label) ? " rflx-tag-active" : ""}`}
                        onClick={() => toggleTag(t.label)}>
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rflx-card">
                  <div className="rflx-card-title rflx-card-title-sm">Life Area</div>
                  <div className="rflx-area-grid">
                    {(Object.keys(LIFE_AREA_LABELS) as LifeArea[]).map(a => (
                      <button key={a} type="button"
                        className={`rflx-area-btn${draft.life_area === a ? " rflx-area-active" : ""}`}
                        onClick={() => updateDraft({ life_area: draft.life_area === a ? null : a })}>
                        {LIFE_AREA_LABELS[a]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rflx-card">
                  <div className="rflx-card-title rflx-card-title-mb">Rate Your Day (1–10)</div>
                  {([
                    { key: "score_productivity" as const, label: "Productivity", icon: <Zap size={13} /> },
                    { key: "score_mood"         as const, label: "Mood",         icon: <Smile size={13} /> },
                    { key: "score_energy"       as const, label: "Energy",       icon: <TrendingUp size={13} /> },
                    { key: "score_focus"        as const, label: "Focus",        icon: <Brain size={13} /> },
                    { key: "score_overall"      as const, label: "Overall Day",  icon: <Star size={13} /> },
                  ]).map(({ key, label, icon }) => (
                    <div key={key} className="rflx-score-item">
                      <div className="rflx-score-label">{icon} {label}</div>
                      <ScorePicker value={draft[key] as ScoreLevel | null} onChange={v => updateDraft({ [key]: v })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right */}
              <div className="rflx-today-right">
                <div className="rflx-card">
                  <div className="rflx-card-title rflx-card-title-sm" style={{ display: "flex", justifyContent: "space-between" }}>
                    Free Write
                    <span className="rflx-wordcount">
                      {(draft.content ?? "").trim() ? (draft.content ?? "").trim().split(/\s+/).length : 0} words
                    </span>
                  </div>
                  <input className="rflx-title-input" placeholder="Give today a title…"
                    value={draft.title ?? ""}
                    onChange={e => updateDraft({ title: e.target.value || null })} />
                  <textarea className="rflx-textarea" rows={7}
                    placeholder="Write freely about your day…"
                    value={draft.content ?? ""}
                    onChange={e => updateDraft({ content: e.target.value })} />
                </div>

                <div className="rflx-card">
                  <div className="rflx-card-title rflx-card-title-sm">Guided Reflection</div>
                  <div className="rflx-prompts-list">
                    {GUIDED_PROMPTS.map(p => {
                      const hasVal = !!((draft.prompts as Record<string, string>)?.[p.key]);
                      const isOpen = activePrompt === p.key || hasVal;
                      return (
                        <div key={p.key} className="rflx-prompt-item">
                          <button type="button" className="rflx-prompt-q"
                            onClick={() => setActivePrompt(isOpen && !hasVal ? null : p.key)}>
                            <span>{p.label}</span>
                            <ChevronRight size={13} style={{ transform: isOpen ? "rotate(90deg)" : undefined, transition: "transform .2s" }} />
                          </button>
                          {isOpen && (
                            <textarea className="rflx-prompt-input" rows={3}
                              placeholder="Your answer…"
                              value={(draft.prompts as Record<string, string>)?.[p.key] ?? ""}
                              onChange={e => setPromptVal(p.key as PromptKey, e.target.value)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rflx-card">
                  <div className="rflx-card-title rflx-card-title-sm">
                    <Heart size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                    Three Gratitudes
                  </div>
                  {[0, 1, 2].map(i => (
                    <input key={i} className="rflx-gratitude-input"
                      placeholder="I am grateful for…"
                      value={(draft.gratitude ?? [])[i] ?? ""}
                      onChange={e => setGratitude(i, e.target.value)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════ TIMELINE ════════════════════════════ */}
        {view === "timeline" && (
          <div className="rflx-timeline-wrap">
            <div className="rflx-page-eyebrow">Timeline</div>
            <div className="rflx-page-title">Your Reflections</div>

            {entries.length === 0 && (
              <div className="rflx-empty-state">
                <div className="rflx-empty-icon">📖</div>
                <div className="rflx-empty-title">No entries yet</div>
                <div className="rflx-empty-sub">Start your first reflection today</div>
                <button type="button" className="rflx-btn-primary" onClick={() => setView("today")}>Begin Today's Reflection</button>
              </div>
            )}

            <div className="rflx-timeline">
              {entries.map(e => {
                const isOpen = selectedEntry?.id === e.id;
                return (
                  <div key={e.id} className={`rflx-tl-item${isOpen ? " rflx-tl-open" : ""}`}
                    role="button" tabIndex={0}
                    onClick={() => setSelectedEntry(isOpen ? null : e)}
                    onKeyDown={ev => ev.key === "Enter" && setSelectedEntry(isOpen ? null : e)}>
                    <div className="rflx-tl-dot">{e.mood ? MOOD_EMOJI[e.mood as MoodLevel] : "·"}</div>
                    <div className="rflx-tl-content">
                      <div className="rflx-tl-head">
                        <div className="rflx-tl-date">{fmtDate(e.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
                        {e.score_overall !== null && e.score_overall !== undefined &&
                          <div className="rflx-tl-score" style={{ color: scoreColor(e.score_overall) }}>{e.score_overall}/10</div>}
                        {daysAgo(e.date) === 0 && <span className="rflx-today-badge">Today</span>}
                      </div>
                      <div className="rflx-tl-title">{e.title ?? "(untitled)"}</div>
                      {!isOpen && e.content && <div className="rflx-tl-preview">{e.content.slice(0, 120)}{e.content.length > 120 ? "…" : ""}</div>}
                      {(e.tags ?? []).length > 0 && (
                        <div className="rflx-tl-tags">{e.tags.map(t => <span key={t} className="rflx-tag">{t}</span>)}</div>
                      )}
                      {isOpen && (
                        <div className="rflx-tl-detail">
                          {e.content && <p className="rflx-tl-body">{e.content}</p>}
                          {Object.entries(e.prompts ?? {}).filter(([, v]) => v).map(([k, v]) => {
                            const prompt = GUIDED_PROMPTS.find(p => p.key === k);
                            return prompt ? (
                              <div key={k} className="rflx-tl-prompt">
                                <div className="rflx-tl-prompt-q">{prompt.label}</div>
                                <div className="rflx-tl-prompt-a">{v}</div>
                              </div>
                            ) : null;
                          })}
                          {(e.gratitude ?? []).filter(Boolean).length > 0 && (
                            <div className="rflx-tl-prompt">
                              <div className="rflx-tl-prompt-q">Gratitude</div>
                              {e.gratitude.filter(Boolean).map((g, i) => <div key={i} className="rflx-tl-prompt-a">· {g}</div>)}
                            </div>
                          )}
                          <div className="rflx-tl-levels">
                            {e.mood   !== null && e.mood   !== undefined && <span>Mood {MOOD_EMOJI[e.mood as MoodLevel]}</span>}
                            {e.energy !== null && e.energy !== undefined && <span>Energy {e.energy}/5</span>}
                            {e.stress !== null && e.stress !== undefined && <span>Stress {e.stress}/5</span>}
                            {e.focus  !== null && e.focus  !== undefined && <span>Focus {e.focus}/5</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════ WINS VAULT ══════════════════════════ */}
        {view === "wins" && (
          <div className="rflx-vault-wrap">
            <div className="rflx-vault-head">
              <div>
                <div className="rflx-page-eyebrow">Wins Vault</div>
                <div className="rflx-page-title">Your Achievements</div>
              </div>
              <button type="button" className="rflx-btn-primary" onClick={() => setAddingWin(true)}>
                <Plus size={14} /> Add Win
              </button>
            </div>

            {addingWin && (
              <div className="rflx-card rflx-add-card">
                <input autoFocus className="rflx-add-input" placeholder="Describe your win…"
                  value={newWinTitle} onChange={e => setNewWinTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void addWin(); if (e.key === "Escape") setAddingWin(false); }} />
                <div className="rflx-add-actions">
                  <button type="button" className="rflx-btn-primary" onClick={() => void addWin()}>Save</button>
                  <button type="button" className="rflx-btn-ghost" onClick={() => setAddingWin(false)}>Cancel</button>
                </div>
              </div>
            )}

            {wins.length === 0 && !addingWin && (
              <div className="rflx-empty-state">
                <div className="rflx-empty-icon">🏆</div>
                <div className="rflx-empty-title">No wins yet</div>
                <div className="rflx-empty-sub">Capture every achievement, big or small</div>
              </div>
            )}

            <div className="rflx-vault-grid">
              {wins.map(w => (
                <div key={w.id} className="rflx-vault-card">
                  <div className="rflx-vault-emoji">🏆</div>
                  <div className="rflx-vault-body">
                    <div className="rflx-vault-title">{w.title}</div>
                    {w.description && <div className="rflx-vault-desc">{w.description}</div>}
                    <div className="rflx-vault-date">{fmtShort(w.date)}</div>
                  </div>
                  <button type="button" className="rflx-vault-del" onClick={() => void deleteWin(w.id)}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════ LESSONS ═════════════════════════════ */}
        {view === "lessons" && (
          <div className="rflx-vault-wrap">
            <div className="rflx-vault-head">
              <div>
                <div className="rflx-page-eyebrow">Lessons Learned</div>
                <div className="rflx-page-title">Personal Knowledge Archive</div>
              </div>
              <button type="button" className="rflx-btn-primary" onClick={() => setAddingLesson(true)}>
                <Plus size={14} /> Add Lesson
              </button>
            </div>

            {addingLesson && (
              <div className="rflx-card rflx-add-card">
                <input autoFocus className="rflx-add-input" placeholder="What did you learn or realize?"
                  value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void addLesson(); if (e.key === "Escape") setAddingLesson(false); }} />
                <div className="rflx-add-actions">
                  <button type="button" className="rflx-btn-primary" onClick={() => void addLesson()}>Save</button>
                  <button type="button" className="rflx-btn-ghost" onClick={() => setAddingLesson(false)}>Cancel</button>
                </div>
              </div>
            )}

            {lessons.length === 0 && !addingLesson && (
              <div className="rflx-empty-state">
                <div className="rflx-empty-icon">💡</div>
                <div className="rflx-empty-title">No lessons yet</div>
                <div className="rflx-empty-sub">Start building your personal knowledge archive</div>
              </div>
            )}

            <div className="rflx-vault-grid">
              {lessons.map(l => (
                <div key={l.id} className="rflx-vault-card">
                  <div className="rflx-vault-emoji">💡</div>
                  <div className="rflx-vault-body">
                    <div className="rflx-vault-title">{l.title}</div>
                    {l.description && <div className="rflx-vault-desc">{l.description}</div>}
                    <div className="rflx-vault-date">{fmtShort(l.date)}</div>
                  </div>
                  <button type="button" className="rflx-vault-del" onClick={() => void deleteLesson(l.id)}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════ STATS ═══════════════════════════════ */}
        {view === "stats" && (
          <div className="rflx-stats-wrap">
            <div className="rflx-page-eyebrow">Statistics</div>
            <div className="rflx-page-title">Your Reflection Journey</div>

            <div className="rflx-stats-grid">
              {[
                { icon: "🔥", label: "Writing Streak",      val: `${stats?.streak ?? 0} days` },
                { icon: "📝", label: "Entries This Month",  val: stats?.entriesMonth ?? 0 },
                { icon: "📚", label: "Total Entries",       val: stats?.totalEntries ?? 0 },
                { icon: "📖", label: "Words Written",       val: (stats?.totalWords ?? 0).toLocaleString() },
                { icon: "😊", label: "Average Mood",        val: stats?.avgMood !== null && stats?.avgMood !== undefined ? `${stats.avgMood}/5` : "—" },
                { icon: "⚡", label: "Avg Productivity",    val: stats?.avgProductivity !== null && stats?.avgProductivity !== undefined ? `${stats.avgProductivity}/10` : "—" },
                { icon: "🌟", label: "Avg Day Score",       val: stats?.avgOverall !== null && stats?.avgOverall !== undefined ? `${stats.avgOverall}/10` : "—" },
                { icon: "🏆", label: "Wins Saved",          val: wins.length },
                { icon: "💡", label: "Lessons Saved",       val: lessons.length },
              ].map(s => (
                <div key={s.label} className="rflx-stats-card">
                  <div className="rflx-stats-emoji">{s.icon}</div>
                  <div className="rflx-stats-val">{s.val}</div>
                  <div className="rflx-stats-label">{s.label}</div>
                </div>
              ))}
            </div>

            {(stats?.topTags ?? []).length > 0 && (
              <div className="rflx-card" style={{ marginTop: 24 }}>
                <div className="rflx-card-title rflx-card-title-mb">Most Used Tags</div>
                <div className="rflx-tags-bar">
                  {(stats!.topTags).map(({ tag, count }) => (
                    <div key={tag} className="rflx-tag-bar-item">
                      <span className="rflx-tag">{tag}</span>
                      <div className="rflx-tag-bar-track">
                        <div className="rflx-tag-bar-fill"
                          style={{ width: `${Math.round(count / (stats!.topTags[0]?.count ?? 1) * 100)}%` }} />
                      </div>
                      <span className="rflx-tag-count">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mood chart */}
            {entries.filter(e => e.mood !== null).length > 0 && (
              <div className="rflx-card" style={{ marginTop: 24 }}>
                <div className="rflx-card-title rflx-card-title-mb">Mood Trend (last 30 days)</div>
                <div className="rflx-mood-chart">
                  {entries.slice(0, 30).reverse().map(e => (
                    <div key={e.id} className="rflx-mood-bar-wrap"
                      title={`${fmtShort(e.date)}: ${e.mood !== null && e.mood !== undefined ? MOOD_LABEL[e.mood as MoodLevel] : "—"}`}>
                      <div className="rflx-mood-bar" style={{
                        height: `${e.mood !== null && e.mood !== undefined ? e.mood * 20 : 4}%`,
                        background: e.mood !== null && e.mood !== undefined
                          ? e.mood >= 4 ? "#2E6B45" : e.mood === 3 ? "#F97316" : "#DC2626"
                          : "#e5e1da",
                      }} />
                    </div>
                  ))}
                </div>
                <div className="rflx-mood-legend">
                  <span style={{ color: "#DC2626" }}>● Low (1–2)</span>
                  <span style={{ color: "#F97316" }}>● Okay (3)</span>
                  <span style={{ color: "#2E6B45" }}>● Good (4–5)</span>
                </div>
              </div>
            )}

            {insights.length > 0 && (
              <div className="rflx-card" style={{ marginTop: 24 }}>
                <div className="rflx-card-title rflx-card-title-mb">✦ AI Insights</div>
                {insights.map((ins, i) => (
                  <div key={i} className="rflx-insight-row">
                    <div className="rflx-insight-dot" />
                    <div className="rflx-insight-text">{ins}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════ SEARCH ══════════════════════════════ */}
        {view === "search" && (
          <div className="rflx-search-wrap">
            <div className="rflx-page-eyebrow">Search</div>
            <div className="rflx-page-title">Find Your Reflections</div>

            <div className="rflx-search-bar">
              <Search size={15} className="rflx-search-icon" />
              <input className="rflx-search-input" placeholder="Search entries…"
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              {searchQuery && (
                <button type="button" className="rflx-search-clear" onClick={() => setSearchQuery("")}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="rflx-search-filters">
              <span className="rflx-filter-label">Mood:</span>
              {([1, 2, 3, 4, 5] as MoodLevel[]).map(m => (
                <button key={m} type="button"
                  className={`rflx-filter-btn${searchMood === m ? " rflx-filter-active" : ""}`}
                  onClick={() => setSearchMood(searchMood === m ? null : m)}>
                  {MOOD_EMOJI[m]}
                </button>
              ))}
              <span className="rflx-filter-label" style={{ marginLeft: 16 }}>Tag:</span>
              {QUICK_TAGS.slice(0, 6).map(t => (
                <button key={t.label} type="button"
                  className={`rflx-filter-btn${searchTag === t.label ? " rflx-filter-active" : ""}`}
                  onClick={() => setSearchTag(searchTag === t.label ? "" : t.label)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="rflx-search-count">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</div>

            <div className="rflx-timeline">
              {searchResults.map(e => (
                <div key={e.id} className="rflx-tl-item" role="button" tabIndex={0}
                  onClick={() => { setSelectedEntry(e); setView("timeline"); }}
                  onKeyDown={ev => ev.key === "Enter" && (setSelectedEntry(e), setView("timeline"))}>
                  <div className="rflx-tl-dot">{e.mood !== null && e.mood !== undefined ? MOOD_EMOJI[e.mood as MoodLevel] : "·"}</div>
                  <div className="rflx-tl-content">
                    <div className="rflx-tl-head">
                      <div className="rflx-tl-date">{fmtDate(e.date, { day: "numeric", month: "short", year: "numeric" })}</div>
                      {e.score_overall !== null && e.score_overall !== undefined &&
                        <div className="rflx-tl-score" style={{ color: scoreColor(e.score_overall) }}>{e.score_overall}/10</div>}
                    </div>
                    <div className="rflx-tl-title">{e.title ?? "(untitled)"}</div>
                    <div className="rflx-tl-preview">{e.content.slice(0, 120)}</div>
                    {(e.tags ?? []).length > 0 && (
                      <div className="rflx-tl-tags">{e.tags.map(t => <span key={t} className="rflx-tag">{t}</span>)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
