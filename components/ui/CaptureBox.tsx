"use client";

import { useState, useRef, useCallback, useId } from "react";
import { ToastContainer, type ToastData }        from "./Toast";

const kindEmoji: Record<string, string> = {
  task:      "✅",
  note:      "📝",
  habit_log: "🏃",
  finance:   "💰",
  health:    "❤️",
  decision:  "⚖️",
};

export function CaptureBox() {
  const [text,      setText]      = useState("");
  const [expanded,  setExpanded]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [toasts,    setToasts]    = useState<ToastData[]>([]);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);
  const uid                       = useId();

  const addToast = useCallback((message: string, kind: ToastData["kind"]) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, kind }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      const res  = await fetch("/api/capture", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: trimmed }),
      });
      const json = (await res.json()) as {
        ok?:             boolean;
        error?:          string;
        classification?: { kind?: string; urgency?: string };
        routedTo?:       string | null;
      };

      if (!res.ok || !json.ok) {
        addToast(json.error ?? "Capture failed", "error");
      } else {
        const kind   = json.classification?.kind ?? "note";
        const emoji  = kindEmoji[kind] ?? "📌";
        const routed = json.routedTo ? ` → ${json.routedTo}` : "";
        addToast(`${emoji} Captured as ${kind}${routed}`, "ok");
        setText("");
        setExpanded(false);
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Network error", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
    if (e.key === "Escape") {
      setExpanded(false);
      textareaRef.current?.blur();
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Backdrop — clicking outside collapses the box */}
      {expanded && (
        <div
          aria-hidden="true"
          onClick={() => setExpanded(false)}
          style={{
            position: "fixed",
            inset:    0,
            zIndex:   9990,
          }}
        />
      )}

      <div
        role="region"
        aria-label="Quick capture"
        style={{
          position:   "fixed",
          bottom:     "20px",
          left:       "50%",
          transform:  "translateX(-50%)",
          zIndex:     9995,
          width:      expanded ? "min(640px, calc(100vw - 32px))" : "min(420px, calc(100vw - 32px))",
          transition: "width 0.25s ease",
        }}
      >
        <div
          style={{
            background:   "oklch(0.22 0.02 80 / 0.97)",
            backdropFilter: "blur(12px)",
            borderRadius: "18px",
            border:       `1px solid oklch(1 0 0 / ${expanded ? 0.15 : 0.08})`,
            boxShadow:    "0 8px 40px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset",
            padding:      expanded ? "14px 14px 10px" : "10px 14px",
            transition:   "padding 0.2s ease, border-color 0.2s ease",
            display:      "flex",
            flexDirection: "column",
            gap:          "10px",
          }}
        >
          {/* Label */}
          <label
            htmlFor={uid}
            style={{
              display:    expanded ? "block" : "none",
              fontSize:   "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color:      "oklch(0.7 0.04 80)",
            }}
          >
            Quick Capture
          </label>

          {/* Input row */}
          <div style={{ display: "flex", alignItems: expanded ? "flex-end" : "center", gap: "8px" }}>
            <span style={{ fontSize: "1rem", lineHeight: 1, flexShrink: 0, paddingBottom: expanded ? "2px" : 0 }}>
              ⚡
            </span>

            <textarea
              id={uid}
              ref={textareaRef}
              rows={expanded ? 3 : 1}
              value={text}
              placeholder={expanded ? "What's on your mind? (Enter to save, Shift+Enter for new line)" : "Capture a thought…"}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setExpanded(true)}
              onKeyDown={handleKeyDown}
              style={{
                flex:       1,
                background: "transparent",
                border:     "none",
                outline:    "none",
                resize:     "none",
                color:      "oklch(0.93 0.02 80)",
                fontSize:   "0.95rem",
                lineHeight: 1.5,
                fontFamily: "var(--font-sans)",
                caretColor: "oklch(0.82 0.14 80)",
                overflow:   expanded ? "auto" : "hidden",
              }}
            />

            {expanded && (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!text.trim() || loading}
                aria-label="Submit capture"
                style={{
                  flexShrink:   0,
                  width:        "36px",
                  height:       "36px",
                  borderRadius: "10px",
                  border:       "none",
                  cursor:       text.trim() && !loading ? "pointer" : "default",
                  background:   text.trim() && !loading
                    ? "oklch(0.72 0.16 80)"
                    : "oklch(0.35 0.02 80)",
                  color:        text.trim() && !loading ? "#fff" : "oklch(0.55 0.02 80)",
                  fontSize:     "1.1rem",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  transition:   "background 0.15s ease",
                }}
              >
                {loading ? (
                  <span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>↻</span>
                ) : "↑"}
              </button>
            )}
          </div>

          {/* Hint */}
          {expanded && (
            <p style={{ margin: 0, fontSize: "0.72rem", color: "oklch(0.5 0.02 80)" }}>
              Classified automatically · Shift+Enter for new line · Esc to close
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
