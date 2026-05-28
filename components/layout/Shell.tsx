import { TopRail }    from "./TopRail";
import { CaptureBox } from "@/components/ui/CaptureBox";

interface ShellProps {
  children:  React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="shell-bg">
      <TopRail />
      <div className="shell-page">
        {children}
      </div>
      <CaptureBox />
    </div>
  );
}
