"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SearchResult } from "@/app/api/search/route";

const TYPE_ICONS: Record<string, string> = {
  task: "✓", note: "📝", issue: "⚠️", idea: "💡", journal: "📖",
};
const TYPE_LABELS: Record<string, string> = {
  task: "Task", note: "Work Note", issue: "Issue", idea: "Idea", journal: "Journal",
};

export function GlobalSearch() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open with Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults([]); }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const j = await r.json() as { results?: SearchResult[] };
    setResults(j.results ?? []);
    setSelected(0);
    setLoading(false);
  }, []);

  function handleInput(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(v), 280);
  }

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected]!.href);
  }

  if (!open) {
    return (
      <button className="gs-trigger" onClick={() => setOpen(true)} title="Search (⌘K)">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>Search</span>
        <kbd>⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="gs-overlay" onClick={() => setOpen(false)}>
      <div className="gs-modal" onClick={e => e.stopPropagation()}>
        <div className="gs-input-wrap">
          <svg className="gs-icon" width="16" height="16" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="#9AA3CC" strokeWidth="1.5"/>
            <path d="M10.5 10.5L13 13" stroke="#9AA3CC" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef} className="gs-input" placeholder="Search tasks, notes, issues, ideas…"
            value={query} onChange={e => handleInput(e.target.value)} onKeyDown={onKeyDown} />
          {loading && <div className="gs-spinner" />}
        </div>
        {results.length > 0 && (
          <div className="gs-results">
            {results.map((r, i) => (
              <button key={r.id} className={`gs-result${i === selected ? " active" : ""}`}
                onClick={() => navigate(r.href)} onMouseEnter={() => setSelected(i)}>
                <span className="gs-result-icon">{TYPE_ICONS[r.type]}</span>
                <div className="gs-result-body">
                  <span className="gs-result-title">{r.title}</span>
                  {r.snippet && <span className="gs-result-snippet">{r.snippet}</span>}
                </div>
                <span className="gs-result-type">{TYPE_LABELS[r.type]}</span>
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="gs-empty">No results for &ldquo;{query}&rdquo;</div>
        )}
        <div className="gs-footer">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
