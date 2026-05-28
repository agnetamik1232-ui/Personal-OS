import { Panel, PanelHeader } from "@/components/ui/Panel";
import { EmptySlot } from "@/components/ui/EmptySlot";

export function DashboardGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Column 1 (span 2) — Tasks & Workflows ── */}
      <div className="lg:col-span-2 space-y-6">

        {/* Tasks */}
        <Panel>
          <PanelHeader
            title="Today's Tasks"
            subtitle="12 open · 3 completed"
            action={<button className="btn btn-ghost btn-sm">View all</button>}
          />
          <EmptySlot label="Task list coming soon" height="h-40" />
        </Panel>

        {/* Workflows / Production */}
        <Panel>
          <PanelHeader
            title="Workflows"
            subtitle="Active production runs"
            action={<button className="btn btn-ghost btn-sm">Manage</button>}
          />
          <EmptySlot label="Workflow cards coming soon" height="h-32" />
        </Panel>

      </div>

      {/* ── Column 2 — Sidebar widgets ── */}
      <div className="space-y-6">

        {/* Habits */}
        <Panel>
          <PanelHeader title="Habits" subtitle="Today's streak" />
          <EmptySlot label="Habit tracker coming soon" height="h-36" />
        </Panel>

        {/* Finance */}
        <Panel>
          <PanelHeader title="Finance" subtitle="Monthly snapshot" />
          <EmptySlot label="Finance overview coming soon" height="h-36" />
        </Panel>

        {/* Capture / Telegram */}
        <Panel>
          <PanelHeader title="Capture" subtitle="Recent items" />
          <EmptySlot label="Telegram capture coming soon" height="h-28" />
        </Panel>

      </div>

      {/* ── Full-width row — Analytics / AI ── */}
      <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Panel>
          <PanelHeader title="Analytics" subtitle="Last 30 days" />
          <EmptySlot label="Analytics charts coming soon" height="h-48" />
        </Panel>

        <Panel>
          <PanelHeader title="AI Memory" subtitle="Recent context" />
          <EmptySlot label="Memory search coming soon" height="h-48" />
        </Panel>

      </div>

    </div>
  );
}
