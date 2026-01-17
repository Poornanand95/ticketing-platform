import { create } from "zustand";
import { apiClient } from "../api/client";
import { authApi } from "../api/auth";
import type { LoginResponse } from "@/types";

interface AuthState {
  user: LoginResponse["user"] | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: LoginResponse["user"]) => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  init: () => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("auth-user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          set({ user, isAuthenticated: true });
        } catch {
          localStorage.removeItem("auth-user");
        }
      }
    }
  },

  login: async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    apiClient.setTokens(response.accessToken, response.refreshToken);
    if (typeof window !== "undefined") {
      localStorage.setItem("auth-user", JSON.stringify(response.user));
    }
    set({
      user: response.user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await authApi.logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-user");
    }
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  setUser: (user: LoginResponse["user"]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth-user", JSON.stringify(user));
    }
    set({ user, isAuthenticated: true });
  },
}));

