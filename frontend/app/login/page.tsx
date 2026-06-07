"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken, token } = useAuthStore();

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) { setToken(t); router.push("/dashboard"); return; }
    if (token) router.push("/dashboard");
  }, []);

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-[#111] border border-white/[0.08] rounded-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-semibold text-white">NeuronOS</span>
          </div>
          <h1 className="text-lg font-medium text-white text-center mb-1">Welcome back</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mb-8">
            Sign in to your AI personal OS
          </p>
          <a
            href={`${API_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full bg-white text-gray-900 text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </a>
          <p className="text-xs text-[hsl(var(--muted-foreground))] text-center mt-6">
            By signing in, you grant read access to your Gmail inbox.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060606]" />}>
      <LoginContent />
    </Suspense>
  );
}
