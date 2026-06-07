"use client";
import { useMutation } from "@tanstack/react-query";
import { RefreshCw, Clock, Mail, Zap, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";

const workflows = [
  {
    id: "gmail-sync",
    name: "Gmail Sync",
    description: "Fetches new emails from Gmail and runs AI priority scoring on each one.",
    schedule: "Every 15 minutes",
    icon: Mail,
    iconColor: "text-purple-400",
    badgeColor: "bg-purple-500/20 text-purple-300",
    action: "sync",
  },
  {
    id: "daily-digest",
    name: "Daily Digest",
    description: "Generates a personalized AI morning briefing combining emails, tasks, and GitHub activity.",
    schedule: "Every day at 8:00 AM",
    icon: Zap,
    iconColor: "text-yellow-400",
    badgeColor: "bg-yellow-500/20 text-yellow-300",
    action: "digest",
  },
  {
    id: "priority-alerts",
    name: "Priority Alerts",
    description: "Sends a Telegram notification when an email scores 80+ priority. Requires Telegram bot token.",
    schedule: "Triggered on sync",
    icon: Bell,
    iconColor: "text-red-400",
    badgeColor: "bg-red-500/20 text-red-300",
    action: null,
  },
];

export default function WorkflowsPage() {
  const syncMutation = useMutation({
    mutationFn: api.syncEmails,
    onSuccess: (data) => toast.success(`Synced ${data.new_emails} new emails`),
    onError: () => toast.error("Sync failed"),
  });

  const digestMutation = useMutation({
    mutationFn: api.getDailyDigest,
    onSuccess: () => toast.success("Digest generated — check your dashboard"),
    onError: () => toast.error("Failed to generate digest"),
  });

  const handleRun = (action: string | null) => {
    if (action === "sync") syncMutation.mutate();
    if (action === "digest") digestMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Workflows" />
      <div className="flex-1 p-6 overflow-y-auto">
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Background jobs powered by Celery + Redis. These run automatically on schedule — you can also trigger them manually.
        </p>

        <div className="space-y-4 max-w-2xl">
          {workflows.map((wf) => {
            const Icon = wf.icon;
            const isLoading =
              (wf.action === "sync" && syncMutation.isPending) ||
              (wf.action === "digest" && digestMutation.isPending);

            return (
              <div
                key={wf.id}
                className="bg-[#111] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4"
              >
                <div className={`mt-0.5 ${wf.iconColor}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-white">{wf.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${wf.badgeColor}`}>
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">{wf.description}</p>
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <Clock size={12} />
                    {wf.schedule}
                  </div>
                </div>
                {wf.action && (
                  <button
                    onClick={() => handleRun(wf.action)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.05] text-white hover:bg-white/10 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                    {isLoading ? "Running..." : "Run now"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 max-w-2xl bg-[#111] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
            Architecture
          </h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
            Gmail sync and AI processing are slow operations (2–5 seconds each). Running them
            synchronously in API handlers would time out under load. The Celery queue lets the
            UI respond immediately while work happens in the background. Redis acts as both
            the message broker and result backend.
          </p>
        </div>
      </div>
    </div>
  );
}
