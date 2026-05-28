import { IconSpark, IconArrow } from "@/components/ui/Icon";

const SUGGESTS = [
  "Reschedule 14:30 to clear writing block",
  "Reply to Marcus — investor intro",
  "Summarise yesterday's journal",
] as const;

export function OperatorCard() {
  return (
    <div className="card card-blush" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Decorative geometry */}
      <svg className="card-deco" style={{ right: -30, top: -30, width: 140, height: 140 }} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="50" fill="rgba(28,26,23,0.04)"/>
      </svg>

      <div className="card-head">
        <div>
          <div className="card-eyebrow">
            <IconSpark size={12} />
            Operator · v4.2
          </div>
          <h3 className="card-title">Drafting your morning brief</h3>
        </div>
      </div>

      <div className="op-status">
        <span className="op-pulse" aria-hidden />
        <span>Working · 12 sources scanned</span>
      </div>

      <p className="op-now">
        Pulled <em>3 emails</em> needing reply, scheduled deep work for the Q3 memo, and queued a follow-up for tomorrow.
      </p>

      <div className="op-suggests">
        {SUGGESTS.map((s) => (
          <button key={s} className="op-suggest">
            <span>{s}</span>
            <span className="op-suggest-arrow"><IconArrow size={12} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}
