interface HeroStripProps {
  name?: string;
  greeting?: string;
  sub?: string;
}

export function HeroStrip({
  name = "Agneta",
  greeting = "Good morning",
  sub = "Light schedule until 14:30, deep-work block protected. Operator has scanned your morning brief.",
}: HeroStripProps) {
  return (
    <div className="hero">
      <div>
        <h1 className="hero-h1">
          {greeting}, {name}.{" "}
          <span className="hero-accent">Here&apos;s your day.</span>
        </h1>
        <p className="hero-sub">{sub}</p>
      </div>

      <div className="hero-meta">
        <span className="meta-chip">
          <span className="chip-dot" />
          Operator online
          <span className="chip-muted">· 12 sources</span>
        </span>
        <span className="meta-chip">
          ☀
          <span>18°C · clear</span>
          <span className="chip-muted">· Dublin</span>
        </span>
      </div>
    </div>
  );
}
