import { apiClient } from "./client";
import type { AutomationRule } from "@/types";

export const automationApi = {
  list: async (orgId: string): Promise<AutomationRule[]> => {
    return apiClient.get<AutomationRule[]>(`/automation/rules?org_id=${orgId}`);
  },

  create: async (data: {
    org_id: string;
    name: string;
    priority?: number;
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    actions: Array<{
      type: string;
      params: Record<string, unknown>;
    }>;
    enabled?: boolean;
  }): Promise<AutomationRule> => {
    return apiClient.post<AutomationRule>("/automation/rules", data);
  },

  update: async (
    id: string,
    data: Partial<AutomationRule>,
  ): Promise<AutomationRule> => {
    return apiClient.patch<AutomationRule>(`/automation/rules/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/automation/rules/${id}`);
  },

  getDefaults: async (orgId: string): Promise<AutomationRule[]> => {
    return apiClient.get<AutomationRule[]>(`/automation/rules/defaults?org_id=${orgId}`);
  },

  toggle: async (id: string, enabled: boolean): Promise<AutomationRule> => {
    return apiClient.patch<AutomationRule>(`/automation/rules/${id}/toggle`, { enabled });
  },

  initializeDefaults: async (orgId: string): Promise<{ created: number; rules: AutomationRule[] }> => {
    return apiClient.post<{ created: number; rules: AutomationRule[] }>(
      "/automation/rules/initialize-defaults",
      { org_id: orgId }
    );
  },
};

