import { TopBar } from "@/components/layout/TopBar";
import { DailyDigest } from "@/components/dashboard/DailyDigest";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { StatCards } from "@/components/dashboard/StatCards";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Dashboard" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl">
          <div className="lg:col-span-2 space-y-5">
            <DailyDigest />
            <ActivityFeed />
          </div>
          <div className="space-y-4">
            <StatCards />
          </div>
        </div>
      </div>
    </div>
  );
}
