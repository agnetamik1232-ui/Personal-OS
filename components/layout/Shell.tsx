import { TopRail }    from "./TopRail";
import { MobileNav }  from "./MobileNav";
import { CaptureBox } from "@/components/ui/CaptureBox";

interface ShellProps {
  children:  React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="shell-bg">
      <MobileNav />
      <TopRail />
      <div className="shell-page">
        {children}
      </div>
      <CaptureBox />
    </div>
  );
}
