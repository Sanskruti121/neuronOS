"use client";
import { Mail, GitCommit, CheckSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

export function ActivityFeed() {
  const { data: emails, isLoading: emailsLoading } = useQuery({
    queryKey: ["emails-feed"],
    queryFn: () => api.getEmails({ limit: 10 }),
  });
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.getTasks(),
  });

  if (emailsLoading || tasksLoading) {
    return (
      <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
        <Skeleton className="h-4 w-24 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 mb-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1"><Skeleton className="h-3 w-full mb-1.5" /><Skeleton className="h-3 w-2/3" /></div>
          </div>
        ))}
      </div>
    );
  }

  type FeedItem = {
    id: string;
    type: "email" | "task";
    title: string;
    subtitle: string;
    time: string;
    badge: string;
    iconColor: string;
    badgeClass: string;
  };

  const feedItems: FeedItem[] = [
    ...(emails?.emails || []).slice(0, 5).map((e: { id: string; subject: string; sender: string; received_at: string }) => ({
      id: e.id,
      type: "email" as const,
      title: e.subject || "(no subject)",
      subtitle: e.sender,
      time: e.received_at ? timeAgo(e.received_at) : "",
      badge: "Email",
      iconColor: "text-purple-400",
      badgeClass: "bg-purple-500/20 text-purple-300",
    })),
    ...(tasks || []).slice(0, 3).map((t: { id: string; title: string; priority: string; created_at: string }) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: `Priority: ${t.priority}`,
      time: t.created_at ? timeAgo(t.created_at) : "",
      badge: "Task",
      iconColor: "text-green-400",
      badgeClass: "bg-green-500/20 text-green-300",
    })),
  ].sort((a, b) => (a.time > b.time ? 1 : -1)).slice(0, 8);

  return (
    <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
      <h2 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-4">
        Activity
      </h2>
      {feedItems.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] py-4 text-center">No recent activity. Sync Gmail to get started.</p>
      ) : (
        <div className="space-y-1">
          {feedItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
              <div className={`mt-0.5 ${item.iconColor}`}>
                {item.type === "email" ? <Mail size={15} /> : item.type === "task" ? <CheckSquare size={15} /> : <GitCommit size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.title}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{item.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${item.badgeClass}`}>{item.badge}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
