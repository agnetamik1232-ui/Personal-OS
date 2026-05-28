import { OPERATOR } from "@/lib/config/operator";

// ── Inline LocalTime (server-rendered shell; client hydration optional) ──────
// We render the timezone label server-side. The actual clock is left to
// the TopRail which already ticks.  Keeping this card fully server-rendered
// avoids a client bundle for a purely decorative value.

function LocationBadge() {
  return (
    <span className="op-badge">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.25 4.5 8.5 4.5 8.5S12.5 9.25 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
          fill="currentColor"
        />
      </svg>
      {OPERATOR.location}
    </span>
  );
}

export function OperatorCard() {
  return (
    <div className="card card-blush op-card">
      {/* Decorative arc */}
      <svg
        className="card-deco"
        style={{ right: -24, top: -24, width: 130, height: 130 }}
        viewBox="0 0 100 100"
        aria-hidden
      >
        <circle cx="50" cy="50" r="50" fill="rgba(28,26,23,0.045)" />
      </svg>

      {/* ── Identity row ── */}
      <div className="op-identity">
        <div className="op-avatar" aria-hidden>
          {OPERATOR.name.charAt(0).toUpperCase()}
        </div>

        <div className="op-identity-text">
          <h3 className="op-name">{OPERATOR.name}</h3>
          <p className="op-role">{OPERATOR.role}</p>
        </div>

        <div className="op-meta-right">
          <LocationBadge />
          <span className="op-badge op-badge-tz">{OPERATOR.timezone.split("/")[1]?.replace("_", " ")}</span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="op-divider" />

      {/* ── Current focus ── */}
      <div className="op-focus-row">
        <span className="op-focus-label">Current Focus</span>
        <p className="op-focus-text">{OPERATOR.currentFocus}</p>
      </div>

      {/* ── Tags ── */}
      {OPERATOR.tags.length > 0 && (
        <div className="op-tags">
          {OPERATOR.tags.map((tag) => (
            <span key={tag} className="op-tag">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
