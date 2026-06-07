"use client";
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

export function DailyDigest() {
  const [displayedText, setDisplayedText] = useState("");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["daily-digest"],
    queryFn: api.getDailyDigest,
  });

  useEffect(() => {
    if (!data?.digest) return;
    setDisplayedText("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(data.digest.slice(0, i + 1));
      i++;
      if (i >= data.digest.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-4/5 mb-2" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-purple-500/20 rounded-xl p-5 relative">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium text-purple-300 uppercase tracking-wider">Daily Digest</h2>
        <div className="flex items-center gap-3">
          {data?.generated_at && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              Generated at {new Date(data.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed">
        {displayedText || "No digest available. Sync your Gmail to generate one."}
        {displayedText && displayedText.length < (data?.digest?.length || 0) && (
          <span className="animate-pulse">▋</span>
        )}
      </p>
    </div>
  );
}
