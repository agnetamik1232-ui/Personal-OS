import { Panel, PanelHeader } from "@/components/ui/Panel";
import { EmptySlot } from "@/components/ui/EmptySlot";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="metric-label mb-1">Analytics</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-4">
          Analytics
        </h1>
      </div>
      <Panel>
        <PanelHeader title="Analytics" subtitle="This section is under construction." />
        <EmptySlot label="Coming soon" height="h-64" />
      </Panel>
    </div>
  );
}
