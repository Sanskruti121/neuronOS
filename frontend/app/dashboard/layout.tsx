"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandBar } from "@/components/command/CommandBar";
import { SearchModal } from "@/components/search/SearchModal";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, setUser, logout } = useAuthStore();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    api.getMe().then(setUser).catch(() => { logout(); router.push("/login"); });
  }, [token]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen((v) => !v); }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-[#060606] overflow-hidden">
      <Sidebar />
      <div className="flex-1 ml-[240px] flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto animate-fade-in-up">
          {children}
        </main>
      </div>
      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
