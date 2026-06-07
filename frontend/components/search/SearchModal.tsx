"use client";
import { useEffect, useRef, useState } from "react";
import { Mail, CheckSquare, X } from "lucide-react";
import { api } from "@/lib/api";

interface SearchResult {
  entity_type: string;
  entity_id: string;
  score: number;
  title: string;
  preview: string;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query);
        setResults(data.results || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[600px] mx-4 animate-modal-in">
        <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="flex items-center px-4 border-b border-white/[0.06]">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && onClose()}
              placeholder="Search emails, tasks, notes..."
              className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-[hsl(var(--muted-foreground))] outline-none"
            />
            <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {!query && (
              <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Try searching for &quot;internship emails&quot; or &quot;urgent tasks&quot;
              </div>
            )}
            {loading && (
              <div className="p-4 text-sm text-[hsl(var(--muted-foreground))] text-center">Searching...</div>
            )}
            {results.map((r) => (
              <div
                key={r.entity_id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] cursor-pointer border-b border-white/[0.04] last:border-0"
              >
                <div className={`mt-0.5 ${r.entity_type === "email" ? "text-purple-400" : "text-green-400"}`}>
                  {r.entity_type === "email" ? <Mail size={16} /> : <CheckSquare size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{r.title}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5">{r.preview}</p>
                </div>
                <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                  {Math.round(r.score * 100)}%
                </span>
              </div>
            ))}
            {query && !loading && results.length === 0 && (
              <div className="p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">No results found</div>
            )}
            {results.length > 0 && (
              <div className="px-4 py-2 text-xs text-[hsl(var(--muted-foreground))] border-t border-white/[0.04]">
                Powered by semantic search
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
