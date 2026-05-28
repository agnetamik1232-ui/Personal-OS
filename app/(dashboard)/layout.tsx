import { Sidebar } from "@/components/layout/Sidebar";
import { TopRail } from "@/components/layout/TopRail";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-ink-0">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopRail />

        <main className="flex-1 overflow-y-auto scroll-y">
          <div className="max-w-screen-2xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
