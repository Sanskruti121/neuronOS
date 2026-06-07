"use client";
import { useState } from "react";
import { RefreshCw, Bell, Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface TopBarProps {
  title: string;
  onSearch?: () => void;
}

export function TopBar({ title, onSearch }: TopBarProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const syncMutation = useMutation({
    mutationFn: api.syncEmails,
    onMutate: () => setSyncing(true),
    onSuccess: (data) => {
      setLastSynced(new Date());
      toast.success(`Synced ${data.new_emails} new emails`);
    },
    onError: () => toast.error("Sync failed"),
    onSettled: () => setSyncing(false),
  });

  return (
    <header className="h-14 border-b border-white/[0.06] flex items-center px-6 gap-4 bg-[#060606]">
      <h1 className="text-sm font-medium text-white flex-1">{title}</h1>

      <p className="text-xs text-[hsl(var(--muted-foreground))] hidden md:block">
        Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-xs">⌘K</kbd> for AI commands
      </p>

      <div className="flex items-center gap-2">
        {onSearch && (
          <button
            onClick={onSearch}
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-white/[0.05]"
          >
            <Search size={14} />
            <kbd className="px-1 py-0.5 rounded bg-white/10 text-xs">/</kbd>
          </button>
        )}
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-white transition-colors px-2 py-1.5 rounded-md hover:bg-white/[0.05] disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : lastSynced ? `${Math.floor((Date.now() - lastSynced.getTime()) / 60000)}m ago` : "Sync"}
        </button>
        <button className="relative text-[hsl(var(--muted-foreground))] hover:text-white transition-colors p-1.5">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}
