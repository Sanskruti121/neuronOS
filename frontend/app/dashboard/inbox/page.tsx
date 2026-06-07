"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Sparkles, Plus, Reply, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";

type Email = {
  id: string;
  subject: string;
  sender: string;
  body_text: string;
  received_at: string;
  ai_summary: string | null;
  priority_score: number | null;
  priority_reason: string | null;
  action_required: boolean;
  has_tasks: boolean;
};

function priorityScoreBadgeClass(score: number | null) {
  if (!score) return "bg-gray-500/20 text-gray-400";
  if (score >= 80) return "bg-red-500/20 text-red-400";
  if (score >= 60) return "bg-orange-500/20 text-orange-400";
  return "bg-gray-500/20 text-gray-400";
}

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "urgent" | "action">("all");
  const [draftModal, setDraftModal] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [editableBody, setEditableBody] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["emails"],
    queryFn: () => api.getEmails({ limit: 50 }),
  });

  const selectedEmail: Email | undefined = data?.emails?.find((e: Email) => e.id === selectedId);

  const reanalyzeMutation = useMutation({
    mutationFn: (id: string) => api.summarizeEmail(id),
    onSuccess: () => { toast.success("Email re-analyzed"); qc.invalidateQueries({ queryKey: ["emails"] }); },
  });

  const draftMutation = useMutation({
    mutationFn: (id: string) => api.draftReply(id),
    onSuccess: (data) => {
      setDraftModal({ to: data.reply_to, subject: data.subject, body: data.draft });
      setEditableBody(data.draft);
    },
    onError: () => toast.error("Failed to draft reply"),
  });

  const sendMutation = useMutation({
    mutationFn: () => api.sendEmail(draftModal!.to, draftModal!.subject, editableBody),
    onSuccess: () => { toast.success("Email sent!"); setDraftModal(null); },
    onError: () => toast.error("Failed to send email"),
  });

  const extractTasksMutation = useMutation({
    mutationFn: (id: string) => api.extractTasksFromEmail(id),
    onSuccess: (tasks) => toast.success(`Created ${tasks.length} task(s)`),
  });

  const emails: Email[] = data?.emails || [];
  const filtered = emails.filter((e) => {
    if (filter === "urgent") return (e.priority_score || 0) >= 80;
    if (filter === "action") return e.action_required;
    return true;
  });

  const filters = [
    { id: "all", label: "All" },
    { id: "urgent", label: "Urgent" },
    { id: "action", label: "Action Required" },
  ] as const;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Inbox" />
      <div className="flex flex-1 overflow-hidden">
        {/* Email list */}
        <div className="w-[380px] shrink-0 border-r border-white/[0.06] flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex gap-1">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs transition-colors",
                    filter === f.id
                      ? "bg-purple-600/20 text-purple-300"
                      : "text-[hsl(var(--muted-foreground))] hover:text-white"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i}><Skeleton className="h-16 w-full" /></div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <Mail size={32} className="text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No emails yet. Sync Gmail to get started.</p>
              </div>
            ) : (
              filtered.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedId(email.id)}
                  className={cn(
                    "px-4 py-3 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.03] transition-colors",
                    selectedId === email.id && "bg-white/[0.05]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm text-white truncate font-medium">{email.subject || "(no subject)"}</p>
                    {email.priority_score !== null && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded shrink-0", priorityScoreBadgeClass(email.priority_score))}>
                        {email.priority_score}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{email.sender}</p>
                  {email.ai_summary && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-1">{email.ai_summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{email.received_at ? timeAgo(email.received_at) : ""}</span>
                    {email.has_tasks && <span className="text-xs text-green-400">Has tasks</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedEmail ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Mail size={40} className="text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Select an email to read</p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-3xl">
              <div className="mb-6">
                <h1 className="text-lg font-semibold text-white mb-1">{selectedEmail.subject}</h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">From: {selectedEmail.sender}</p>
                {selectedEmail.received_at && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    {new Date(selectedEmail.received_at).toLocaleString()}
                  </p>
                )}
              </div>

              {selectedEmail.ai_summary && (
                <div className="bg-[#111] border border-purple-500/20 rounded-xl p-4 mb-5">
                  <h3 className="text-xs font-medium text-purple-300 uppercase tracking-wider mb-2">AI Analysis</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn("text-sm font-medium px-2 py-0.5 rounded", priorityScoreBadgeClass(selectedEmail.priority_score))}>
                      Priority: {selectedEmail.priority_score}/100
                    </span>
                    {selectedEmail.action_required && (
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Action Required</span>
                    )}
                  </div>
                  <p className="text-sm text-[hsl(var(--foreground))]">{selectedEmail.ai_summary}</p>
                  {selectedEmail.priority_reason && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">{selectedEmail.priority_reason}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 mb-5 flex-wrap">
                <button
                  onClick={() => draftMutation.mutate(selectedEmail.id)}
                  disabled={draftMutation.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                >
                  <Reply size={12} />
                  {draftMutation.isPending ? "Drafting..." : "AI Draft Reply"}
                </button>
                <button
                  onClick={() => reanalyzeMutation.mutate(selectedEmail.id)}
                  disabled={reanalyzeMutation.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors disabled:opacity-50"
                >
                  <Sparkles size={12} />
                  {reanalyzeMutation.isPending ? "Analyzing..." : "Re-analyze with AI"}
                </button>
                <button
                  onClick={() => extractTasksMutation.mutate(selectedEmail.id)}
                  disabled={extractTasksMutation.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/30 transition-colors disabled:opacity-50"
                >
                  <Plus size={12} />
                  {extractTasksMutation.isPending ? "Extracting..." : "Extract Tasks"}
                </button>
              </div>

              <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
                <h3 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">Email Body</h3>
                <pre className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedEmail.body_text || "No content"}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draft / Send Modal */}
      {draftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDraftModal(null)} />
          <div className="relative bg-[#111] border border-white/10 rounded-xl w-full max-w-2xl mx-4 shadow-2xl animate-modal-in flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-medium text-white">AI Draft Reply</h2>
              <button onClick={() => setDraftModal(null)} className="text-[hsl(var(--muted-foreground))] hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[hsl(var(--muted-foreground))] w-12">To:</span>
                <input
                  value={draftModal.to}
                  onChange={(e) => setDraftModal({ ...draftModal, to: e.target.value })}
                  className="flex-1 bg-transparent text-white outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[hsl(var(--muted-foreground))] w-12">Subject:</span>
                <input
                  value={draftModal.subject}
                  onChange={(e) => setDraftModal({ ...draftModal, subject: e.target.value })}
                  className="flex-1 bg-transparent text-white outline-none"
                />
              </div>
            </div>
            <textarea
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
              className="flex-1 px-5 py-4 bg-transparent text-sm text-[hsl(var(--foreground))] outline-none resize-none leading-relaxed overflow-y-auto"
              rows={14}
            />
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
              <button onClick={() => setDraftModal(null)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-white px-3 py-1.5">
                Cancel
              </button>
              <button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
                className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send size={12} />
                {sendMutation.isPending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
