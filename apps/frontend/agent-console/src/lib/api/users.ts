import { apiClient } from "./client";
import type { User, Organization } from "@/types";

export const usersApi = {
  getById: async (id: string): Promise<User> => {
    return apiClient.get<User>(`/users/${id}`);
  },

  getAgents: async (filters?: { skill?: string }): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters?.skill) params.append("skill", filters.skill);
    const query = params.toString();
    return apiClient.get<User[]>(`/users${query ? `?${query}` : ""}`);
  },

  updateAgent: async (
    id: string,
    data: { skills?: string[]; is_active?: boolean },
  ): Promise<User> => {
    return apiClient.put<User>(`/users/${id}`, data);
  },

  getOrganization: async (id: string): Promise<Organization> => {
    return apiClient.get<Organization>(`/orgs/${id}`);
  },
};

