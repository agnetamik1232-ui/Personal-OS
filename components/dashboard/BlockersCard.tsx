import { IconAlert } from "@/components/ui/Icon";

type Severity = "high" | "med" | "low";

interface Blocker {
  sev: Severity;
  title: string;
  meta: string;
  ago: string;
}

const SEV_CLASS: Record<Severity, string> = {
  high: "blocker-sev blocker-sev-high",
  med:  "blocker-sev blocker-sev-med",
  low:  "blocker-sev blocker-sev-low",
};

const BLOCKERS: Blocker[] = [
  { sev: "high", title: "Stripe webhook failing on production", meta: "Brain · since 06:14", ago: "2h" },
  { sev: "med",  title: "Awaiting reply from Lena (contract)",  meta: "CRM · sent Mon",     ago: "3d" },
  { sev: "low",  title: "Energy dip after lunch this week",     meta: "Health · pattern",   ago: "5d" },
];

export function BlockersCard() {
  return (
    <div className="card card-lav">
      <svg className="card-deco" style={{ left: -24, bottom: -24, width: 120, height: 120 }} viewBox="0 0 100 100" aria-hidden>
        <polygon points="50,0 100,86 0,86" fill="rgba(28,26,23,0.03)"/>
      </svg>

      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconAlert size={12} /> Key Blockers</div>
          <h3 className="card-title">{BLOCKERS.length} items need you</h3>
        </div>
        <button className="card-action">All</button>
      </div>

      <div className="blockers">
        {BLOCKERS.map((b) => (
          <div className="blocker" key={b.title}>
            <span className={SEV_CLASS[b.sev]} aria-label={`${b.sev} severity`} />
            <div className="blocker-body">
              <div className="blocker-title">{b.title}</div>
              <div className="blocker-meta">{b.meta}</div>
            </div>
            <div className="blocker-ago">{b.ago}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
