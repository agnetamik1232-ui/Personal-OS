import { TopRail } from "./TopRail";
import { HeroStrip } from "./HeroStrip";

interface ShellProps {
  children: React.ReactNode;
  showHero?: boolean;
}

export function Shell({ children, showHero = true }: ShellProps) {
  return (
    <div className="shell-bg">
      <TopRail />
      <div className="shell-page">
        {showHero && <HeroStrip />}
        {children}
      </div>
    </div>
  );
}
