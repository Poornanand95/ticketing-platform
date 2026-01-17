import { apiClient } from "./client";
import type { LoginResponse } from "@/types";

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>("/auth/login", { email, password });
  },

  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>("/auth/refresh", { refreshToken });
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
    apiClient.clearTokens();
  },
};

