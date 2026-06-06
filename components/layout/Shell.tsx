import { Sidebar }      from "./Sidebar";
import { MobileNav }    from "./MobileNav";
import { CaptureBox }   from "@/components/ui/CaptureBox";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="shell-root">
      {/* Sidebar — desktop only */}
      <div className="shell-sidebar">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="shell-main">
        {/* Mobile nav — shown only on small screens */}
        <MobileNav />
        <main className="shell-content">
          {children}
        </main>
      </div>

      <CaptureBox />
    </div>
  );
}
