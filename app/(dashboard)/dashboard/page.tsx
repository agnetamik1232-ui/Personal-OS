import { HeroStrip }    from "@/components/layout/HeroStrip";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <HeroStrip />
      <DashboardGrid />
    </>
  );
}
