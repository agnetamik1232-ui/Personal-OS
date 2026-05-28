import { IconCoin } from "@/components/ui/Icon";

const SPARK_DATA = [22, 28, 24, 31, 27, 34, 30, 38, 36, 42, 39, 46];
const W = 260, H = 60;

function buildSparkPath(data: number[]): { line: string; area: string } {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const px = (i: number) => (i / (data.length - 1)) * W;
  const py = (v: number) => H - ((v - min) / range) * (H - 8) - 4;
  const pts = data.map((v, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
  return { line: pts, area: `${pts} L ${W} ${H} L 0 ${H} Z` };
}

const ROWS = [
  { label: "Income MTD",       color: "#2E6B45", value: "+ €12,450" },
  { label: "Burn MTD",         color: "#B85C5C", value: "– €7,830"  },
  { label: "Pending invoices", color: "#C99C4A", value: "€4,200"    },
] as const;

export function FinanceCard() {
  const { line, area } = buildSparkPath(SPARK_DATA);

  return (
    <div className="card">
      <svg className="card-deco" style={{ right: -20, bottom: -20, width: 100, height: 100 }} viewBox="0 0 100 100" aria-hidden>
        <rect x="20" y="20" width="60" height="60" rx="14" fill="rgba(28,26,23,0.03)"/>
      </svg>

      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconCoin size={12} /> Finance Pulse</div>
          <h3 className="card-title">Cash on hand</h3>
        </div>
        <button className="card-action">May</button>
      </div>

      <div className="fin-head">
        <div className="fin-amount">€48,212</div>
        <div className="fin-delta">+4.8%</div>
      </div>
      <div className="fin-label">vs. last month · runway 8.2 mo</div>

      <div className="fin-spark">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
          <defs>
            <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2E6B45" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#2E6B45" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={area} fill="url(#finGrad)"/>
          <path d={line} fill="none" stroke="#2E6B45" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx={W} cy={60 - ((46 - 22) / (46 - 22)) * (60 - 8) - 4} r="3" fill="#2E6B45"/>
        </svg>
      </div>

      <div className="fin-rows">
        {ROWS.map((r) => (
          <div className="fin-row" key={r.label}>
            <span className="fin-row-label">
              <span className="fin-swatch" style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="fin-val">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
