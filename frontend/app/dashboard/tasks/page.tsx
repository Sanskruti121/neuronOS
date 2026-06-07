"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";
import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { cn, priorityBadgeClass } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  status: string;
  source_email_id: string | null;
  created_at: string;
};

export default function TasksPage() {
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDue, setNewDue] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const qc = useQueryClient();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["tasks", filterStatus],
    queryFn: () => api.getTasks(filterStatus ? { status: filterStatus } : {}),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createTask({ title: newTitle, priority: newPriority, due_date: newDue || undefined }),
    onSuccess: () => {
      toast.success("Task created");
      setNewTitle(""); setNewDue(""); setShowNew(false);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.updateTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => { toast.success("Task deleted"); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });

  const today = new Date().toISOString().split("T")[0];
  const todayCount = tasks?.filter((t) => t.due_date === today && t.status !== "done").length || 0;
  const overdueCount = tasks?.filter((t) => t.due_date && t.due_date < today && t.status !== "done").length || 0;
  const doneCount = tasks?.filter((t) => t.status === "done").length || 0;

  const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];
  const grouped = PRIORITY_ORDER.reduce((acc, p) => {
    acc[p] = (tasks || []).filter((t) => t.priority === p);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Tasks" />
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Stats */}
        <div className="flex items-center gap-6 mb-6 text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Total: <strong className="text-white">{tasks?.length || 0}</strong></span>
          <span className="text-[hsl(var(--muted-foreground))]">Due today: <strong className="text-orange-400">{todayCount}</strong></span>
          <span className="text-[hsl(var(--muted-foreground))]">Overdue: <strong className="text-red-400">{overdueCount}</strong></span>
          <span className="text-[hsl(var(--muted-foreground))]">Done this week: <strong className="text-green-400">{doneCount}</strong></span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex gap-1">
            {[undefined, "pending", "in_progress", "done"].map((s) => (
              <button
                key={s || "all"}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-colors",
                  filterStatus === s
                    ? "bg-purple-600/20 text-purple-300"
                    : "text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/[0.05]"
                )}
              >
                {s === undefined ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            <Plus size={14} /> New Task
          </button>
        </div>

        {/* New task form */}
        {showNew && (
          <div className="bg-[#111] border border-purple-500/20 rounded-xl p-4 mb-5">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full bg-transparent text-sm text-white placeholder:text-[hsl(var(--muted-foreground))] outline-none mb-3"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="text-xs bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-2 py-1 outline-none"
              >
                {["low", "medium", "high", "urgent"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="text-xs bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-2 py-1 outline-none"
              />
              <button
                onClick={() => newTitle && createMutation.mutate()}
                disabled={!newTitle || createMutation.isPending}
                className="ml-auto text-xs px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
              <button onClick={() => setShowNew(false)} className="text-xs text-[hsl(var(--muted-foreground))] hover:text-white">
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (tasks?.length === 0) ? (
          <div className="text-center py-16">
            <CheckSquare size={40} className="text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">No tasks yet. Sync your Gmail to auto-extract action items.</p>
            <button onClick={() => setShowNew(true)} className="text-xs text-purple-400 hover:text-purple-300">
              Or create one manually
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {PRIORITY_ORDER.map((priority) => {
              const group = grouped[priority];
              if (!group.length) return null;
              return (
                <div key={priority}>
                  <h3 className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2 px-1">
                    {priority}
                  </h3>
                  <div className="space-y-1">
                    {group.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 px-4 py-3 bg-[#111] border border-white/[0.06] rounded-xl hover:border-white/10 transition-colors group"
                      >
                        <button
                          onClick={() => updateMutation.mutate({ id: task.id, data: { status: task.status === "done" ? "pending" : "done" } })}
                          className="text-[hsl(var(--muted-foreground))] hover:text-purple-400 transition-colors shrink-0"
                        >
                          {task.status === "done" ? <CheckSquare size={16} className="text-green-400" /> : <Square size={16} />}
                        </button>
                        <span className={cn("text-sm flex-1", task.status === "done" && "line-through text-[hsl(var(--muted-foreground))]")}>
                          {task.title}
                        </span>
                        {task.source_email_id && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded shrink-0">From Email</span>
                        )}
                        <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0", priorityBadgeClass(task.priority))}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className={cn("text-xs shrink-0", task.due_date < today ? "text-red-400" : task.due_date === today ? "text-orange-400" : "text-[hsl(var(--muted-foreground))]")}>
                            {task.due_date}
                          </span>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(task.id)}
                          className="text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
