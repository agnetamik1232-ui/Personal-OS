"use client";

import { useState, useRef } from "react";
import type { TaskRow }      from "@/app/api/tasks/route";
import { TaskCard }          from "./TaskCard";
import type { SmartResult }  from "@/app/api/tasks/smart/route";

interface Props {
  tasks:  TaskRow[];
  onOpen: (task: TaskRow) => void;
}

const SUGGESTIONS = [
  "What should I do this morning?",
  "What's blocking me right now?",
  "Show me everything due today",
  "Key tasks for this week",
  "What needs the most attention?",
];

export function SmartView({ tasks, onOpen }: Props) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<TaskRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [method,  setMethod]  = useState<SmartResult["method"] | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  async function search(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res  = await fetch("/api/tasks/smart", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: trimmed, tasks }),
      });
      const json = await res.json() as SmartResult & { error?: string };
      if (!res.ok) { setError(json.error ?? "Search failed"); return; }

      const idSet = new Set(json.ids);
      // Preserve Claude's ranking order
      const ranked = json.ids
        .map((id) => tasks.find((t) => t.id === id))
        .filter((t): t is TaskRow => t != null);
      // Append any matched tasks Claude returned but we couldn't find (edge case)
      const extra  = tasks.filter((t) => idSet.has(t.id) && !ranked.find((r) => r.id === t.id));
      setResults([...ranked, ...extra]);
      setMethod(json.method);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") void search(query);
    if (e.key === "Escape") { setQuery(""); setResults(null); }
  }

  function reset() {
    setQuery(""); setResults(null); setError(null); setMethod(null);
    inputRef.current?.focus();
  }

  return (
    <div className="crm-smart">
      {/* Search bar */}
      <div className="crm-smart-bar">
        <span className="crm-smart-icon" aria-hidden>✦</span>
        <input
          ref={inputRef}
          className="crm-smart-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder={'Ask anything — “what should I do this morning?”'}
          aria-label="Smart task search"
          autoFocus
        />
        {query && (
          <button className="crm-smart-clear" onClick={reset} aria-label="Clear">×</button>
        )}
        <button
          className="crm-smart-go"
          onClick={() => void search(query)}
          disabled={loading || !query.trim()}
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      {/* Suggestions */}
      {!results && !loading && (
        <div className="crm-smart-suggestions">
          <p className="crm-smart-suggestions-label">Try asking:</p>
          <div className="crm-smart-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="crm-smart-chip" onClick={() => void search(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="crm-smart-loading">
          <span className="crm-smart-spin">✦</span> Thinking…
        </div>
      )}

      {/* Error */}
      {error && <p className="crm-smart-error">⚠ {error}</p>}

      {/* Results */}
      {results !== null && !loading && (
        <div className="crm-smart-results">
          <div className="crm-smart-results-header">
            <span>
              {results.length === 0
                ? "No matching tasks"
                : `${results.length} task${results.length !== 1 ? "s" : ""} found`}
            </span>
            {method && (
              <span className="crm-smart-method">
                via {method === "claude" ? "Claude ✦" : "keyword search"}
              </span>
            )}
          </div>
          <div className="crm-smart-grid">
            {results.map((task) => (
              <TaskCard key={task.id} task={task} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
