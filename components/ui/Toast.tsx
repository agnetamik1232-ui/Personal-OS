"use client";

import { useEffect, useState } from "react";

export interface ToastData {
  id:      number;
  message: string;
  kind:    "ok" | "error";
}

interface ToastProps {
  toast:      ToastData;
  onDismiss:  (id: number) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount → fade in
    const show = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss after 3.5 s
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        transition:    "opacity 0.3s ease, transform 0.3s ease",
        opacity:        visible ? 1 : 0,
        transform:      visible ? "translateY(0)" : "translateY(8px)",
        pointerEvents:  "auto",
        display:        "flex",
        alignItems:     "center",
        gap:            "0.5rem",
        background:     toast.kind === "ok" ? "oklch(0.28 0.02 100)" : "oklch(0.28 0.04 20)",
        color:          "#fff",
        borderRadius:   "14px",
        padding:        "0.6rem 1rem",
        fontSize:       "0.85rem",
        fontWeight:     500,
        boxShadow:      "0 4px 20px rgba(0,0,0,0.25)",
        cursor:         "pointer",
        maxWidth:       "320px",
        whiteSpace:     "nowrap",
        overflow:       "hidden",
        textOverflow:   "ellipsis",
      }}
      onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
    >
      <span>{toast.kind === "ok" ? "✓" : "✕"}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{toast.message}</span>
    </div>
  );
}

// ── ToastContainer ────────────────────────────────────────────────────────────
// Renders a stack of toasts in the bottom-right corner (above CaptureBox).

interface ToastContainerProps {
  toasts:    ToastData[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position:       "fixed",
        bottom:         "90px",
        right:          "24px",
        zIndex:         9999,
        display:        "flex",
        flexDirection:  "column",
        gap:            "8px",
        alignItems:     "flex-end",
        pointerEvents:  "none",
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
