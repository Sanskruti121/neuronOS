"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Mail, CheckSquare, GitBranch, Bot, Settings, Zap, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/inbox", icon: Mail, label: "Inbox" },
  { href: "/dashboard/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/dashboard/workflows", icon: GitBranch, label: "Workflows" },
  { href: "/dashboard/ai", icon: Bot, label: "AI Assistant" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col z-20">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-white">NeuronOS</span>
      </div>

      <nav className="flex-1 py-4 px-3">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all",
                active
                  ? "bg-purple-600/15 text-purple-300"
                  : "text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/[0.05]"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-medium text-white">
            {user?.name?.[0] || user?.email?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name || "User"}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
