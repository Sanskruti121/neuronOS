"use client";
import { Mail, CheckSquare, GitPullRequest, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconColor: string;
}

function StatCard({ icon, label, value, iconColor }: StatCardProps) {
  return (
    <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-white animate-fade-in-up">{value}</p>
    </div>
  );
}

export function StatCards() {
  const { data: emailsData, isLoading: emailsLoading } = useQuery({
    queryKey: ["emails-count"],
    queryFn: () => api.getEmails({ limit: 1 }),
  });
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.getTasks(),
  });

  if (emailsLoading || tasksLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
    );
  }

  const openTasks = tasksData?.filter((t: { status: string }) => t.status !== "done").length || 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        icon={<Mail size={16} />}
        label="Emails"
        value={emailsData?.total || 0}
        iconColor="text-purple-400"
      />
      <StatCard
        icon={<CheckSquare size={16} />}
        label="Open Tasks"
        value={openTasks}
        iconColor="text-green-400"
      />
      <StatCard
        icon={<GitPullRequest size={16} />}
        label="PRs to Review"
        value="—"
        iconColor="text-blue-400"
      />
      <StatCard
        icon={<Clock size={16} />}
        label="Focus Today"
        value="—"
        iconColor="text-orange-400"
      />
    </div>
  );
}
