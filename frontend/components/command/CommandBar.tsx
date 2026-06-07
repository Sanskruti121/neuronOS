"use client";
import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";

const SUGGESTIONS = [
  { label: "Summarize today", query: "Summarize my emails and tasks for today" },
  { label: "Show urgent emails", query: "What emails need my urgent attention?" },
  { label: "What's due this week?", query: "Show me tasks due this week" },
  { label: "How was my coding this week?", query: "Summarize my GitHub activity this week" },
  { label: "Create task from latest email", query: "What action items are in my latest emails?" },
];

interface CommandBarProps {
  open: boolean;
  onClose: () => void;
}

export function CommandBar({ open, onClose }: CommandBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ response: string; sources: string[] } | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResponse(null);
      setDisplayedText("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!response) return;
    setDisplayedText("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(response.response.slice(0, i + 1));
      i++;
      if (i >= response.response.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [response]);

  const runQuery = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const result = await api.runCommand(q);
      setResponse(result);
    } catch {
      setResponse({ response: "Sorry, I couldn't process that request. Please try again.", sources: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runQuery(query);
    if (e.key === "Escape") onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[600px] mx-4 animate-modal-in">
        <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center px-4 border-b border-white/[0.06]">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask NeuronOS anything..."
              className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-[hsl(var(--muted-foreground))] outline-none"
            />
            {loading && <Loader2 size={16} className="animate-spin text-purple-400 mr-2" />}
            <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {!query && !response && (
              <div className="p-3">
                <p className="text-xs text-[hsl(var(--muted-foreground))] px-2 pb-2">Suggestions</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.query}
                    onClick={() => { setQuery(s.label); runQuery(s.query); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[hsl(var(--foreground))] hover:bg-white/[0.05] transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="p-6 flex items-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-purple-400"
                      style={{ animation: `pulse-subtle 1s ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">NeuronOS is thinking...</span>
              </div>
            )}

            {response && !loading && (
              <div className="p-5">
                <div className="text-sm text-[hsl(var(--foreground))] leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      code: ({ children }) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                    }}
                  >
                    {displayedText}
                  </ReactMarkdown>
                  {displayedText.length < response.response.length && (
                    <span className="animate-pulse">▋</span>
                  )}
                </div>
                {response.sources.length > 0 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4">
                    Based on: {response.sources.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
