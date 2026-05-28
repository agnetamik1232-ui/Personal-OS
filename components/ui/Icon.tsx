interface IconProps {
  size?: number;
  className?: string;
}

const base = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconSpark({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.8" className={className}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>
    </svg>
  );
}

export function IconBolt({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>
    </svg>
  );
}

export function IconCoin({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M9 9c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5-2 2-3 2-3 .5-3 2 1.3 2.5 3 2.5 3-1 3-2.5M12 4v2M12 18v2"/>
    </svg>
  );
}

export function IconAlert({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.8" className={className}>
      <path d="M12 3 2 20h20L12 3z"/>
      <path d="M12 10v5M12 18h.01"/>
    </svg>
  );
}

export function IconFocus({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
    </svg>
  );
}

export function IconHabit({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.8" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3"/>
      <path d="M8 3v4M16 3v4M3 11h18"/>
    </svg>
  );
}

export function IconFlag({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.8" className={className}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5"/>
    </svg>
  );
}

export function IconLeaf({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.8" className={className}>
      <path d="M20 4c-9 0-15 5-15 12 0 2 1 4 3 4 7 0 12-6 12-16z"/>
      <path d="M5 20c3-7 8-11 13-12"/>
    </svg>
  );
}

export function IconCheck({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="2.4" className={className}>
      <path d="M5 12.5 10 17 19 7"/>
    </svg>
  );
}

export function IconSearch({ size = 13, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7"/>
      <path d="m20 20-3.5-3.5"/>
    </svg>
  );
}

export function IconArrow({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth="1.8" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  );
}

export function IconPlay({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 5v14l12-7z"/>
    </svg>
  );
}

export function IconPause({ size = 12, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1"/>
      <rect x="14" y="5" width="4" height="14" rx="1"/>
    </svg>
  );
}
