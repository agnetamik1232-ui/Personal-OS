"use client";

import { useState, useRef, useCallback } from "react";

interface CaptureResult {
  ok:             boolean;
  classification?: { kind: string };
  routedTo?:       string | null;
}

const PLACEHOLDERS = [
  "What's on your mind?",
  "Log a task, idea, expense, or note…",
  "Type anything — it gets routed automatically",
  "Feeling something? Write it down.",
  "Capture a thought before it slips away…",
];

const placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]!;

const KIND_LABELS: Record<string, string> = {
  task:    "✅ Saved as task",
  expense: "💸 Logged as expense",
  note:    "📝 Saved as note",
  idea:    "💡 Saved as idea",
  goal:    "🎯 Saved as goal",
  habit:   "🔁 Saved as habit",
  journal: "📖 Saved to journal",
  event:   "📅 Added to calendar",
};

export function CaptureCard() {
  const [text,    setText]    = useState("");
  const [status,  setStatus]  = useState<"idle" | "saving" | "done" | "error">("idle");
  const [result,  setResult]  = useState<CaptureResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/capture", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: trimmed }),
      }).then(r => r.json() as Promise<CaptureResult>);
      setResult(res);
      setStatus("done");
      setText("");
      setTimeout(() => { setStatus("idle"); setResult(null); }, 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }, [text]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const kind = result?.classification?.kind ?? "note";
  const doneLabel = KIND_LABELS[kind] ?? "✅ Captured";

  return (
    <div className="card cap-card">
      <div className="cap-header">
        <div className="card-eyebrow">⚡ Capture</div>
        <div className="cap-hint">Enter to save · Shift+Enter for new line</div>
      </div>

      <div className={`cap-input-wrap${status === "done" ? " cap-input-done" : ""}`}>
        {status === "done" ? (
          <div className="cap-done">
            <span className="cap-done-label">{doneLabel}</span>
            {result?.routedTo && (
              <span className="cap-routed-to">→ {result.routedTo}</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="cap-textarea"
            rows={2}
            placeholder={placeholder}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={status === "saving"}
            aria-label="Capture a thought"
          />
        )}
      </div>

      <div className="cap-footer">
        {status === "error" && (
          <span className="cap-error">Something went wrong — try again</span>
        )}
        {status !== "done" && (
          <button
            type="button"
            className="cap-btn"
            disabled={!text.trim() || status === "saving"}
            onClick={() => void submit()}
          >
            {status === "saving" ? "Saving…" : "Capture →"}
          </button>
        )}
      </div>
    </div>
  );
}
