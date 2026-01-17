import { apiClient } from "./client";
import type { Bucket, CustomFieldDefinition } from "@/types";

export const bucketsApi = {
  list: async (includeCount = false): Promise<Bucket[]> => {
    const params = includeCount ? "?include_count=true" : "";
    return apiClient.get<Bucket[]>(`/buckets${params}`);
  },

  getById: async (id: string): Promise<Bucket> => {
    return apiClient.get<Bucket>(`/buckets/${id}`);
  },

  create: async (data: {
    name: string;
    tag?: string | null;
    description?: string | null;
    color?: string | null;
    custom_fields?: CustomFieldDefinition[];
  }): Promise<Bucket> => {
    return apiClient.post<Bucket>("/buckets", data);
  },

  update: async (
    id: string,
    data: {
      name?: string;
      tag?: string | null;
      description?: string | null;
      color?: string | null;
      custom_fields?: CustomFieldDefinition[];
    },
  ): Promise<Bucket> => {
    return apiClient.patch<Bucket>(`/buckets/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/buckets/${id}`);
  },
};

