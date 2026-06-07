import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
  has_gmail: boolean;
  has_github: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) localStorage.setItem("neuronos_token", token);
        else localStorage.removeItem("neuronos_token");
        set({ token });
      },
      logout: () => {
        localStorage.removeItem("neuronos_token");
        set({ user: null, token: null });
      },
    }),
    { name: "neuronos-auth", partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
