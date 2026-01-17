import { apiClient } from "./client";
import type { Metrics, AgentPerformance } from "@/types";

export const reportsApi = {
  getMetrics: async (params: {
    org_id: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Metrics> => {
    const queryParams = new URLSearchParams();
    queryParams.append("org_id", params.org_id);
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);

    return apiClient.get<Metrics>(`/reports/metrics?${queryParams.toString()}`);
  },

  getAgentPerformance: async (params: {
    org_id: string;
    agent_id: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AgentPerformance> => {
    const queryParams = new URLSearchParams();
    queryParams.append("org_id", params.org_id);
    queryParams.append("agent_id", params.agent_id);
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);

    return apiClient.get<AgentPerformance>(
      `/reports/agent-performance?${queryParams.toString()}`,
    );
  },

  export: async (): Promise<Blob> => {
    const response = await apiClient.get("/reports/export", {
      responseType: "blob",
    });
    return response as unknown as Blob;
  },
};

