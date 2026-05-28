import { Panel, PanelHeader } from "@/components/ui/Panel";
import { EmptySlot } from "@/components/ui/EmptySlot";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <p className="metric-label mb-1">Settings</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-4">
          Settings
        </h1>
      </div>
      <Panel>
        <PanelHeader title="Settings" subtitle="This section is under construction." />
        <EmptySlot label="Coming soon" height="h-64" />
      </Panel>
    </div>
  );
}
