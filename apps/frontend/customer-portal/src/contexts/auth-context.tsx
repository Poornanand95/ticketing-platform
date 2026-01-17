"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createApiClient, type LoginResponse } from "@/lib/api";

interface AuthContextType {
  user: LoginResponse["user"] | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  apiClient: ReturnType<typeof createApiClient>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginResponse["user"] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const getToken = useCallback(() => token, [token]);
  
  const getRefreshToken = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refreshToken");
    }
    return null;
  }, []);

  const handleTokenRefresh = useCallback((tokens: LoginResponse) => {
    setToken(tokens.accessToken);
    setUser(tokens.user);
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    localStorage.setItem("user", JSON.stringify(tokens.user));
  }, []);

  const apiClient = useMemo(
    () => createApiClient(getToken, getRefreshToken, handleTokenRefresh),
    [getToken, getRefreshToken, handleTokenRefresh]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    const storedRefreshToken = localStorage.getItem("refreshToken");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setIsLoading(false);
    } else if (storedRefreshToken) {
      // Create a temporary client for token refresh (before apiClient is ready)
      const tempClient = createApiClient(() => null);
      tempClient
        .refreshToken(storedRefreshToken)
        .then((response) => {
          setToken(response.accessToken);
          setUser(response.user);
          localStorage.setItem("accessToken", response.accessToken);
          localStorage.setItem("refreshToken", response.refreshToken);
          localStorage.setItem("user", JSON.stringify(response.user));
        })
        .catch(() => {
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.login(email, password);
    setToken(response.accessToken);
    setUser(response.user);
    localStorage.setItem("accessToken", response.accessToken);
    localStorage.setItem("refreshToken", response.refreshToken);
    localStorage.setItem("user", JSON.stringify(response.user));
    router.push("/tickets");
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isLoading, apiClient }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

