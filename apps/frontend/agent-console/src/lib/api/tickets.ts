import { apiClient } from "./client";
import type { Ticket, TicketMessage } from "@/types";

export interface TicketFilters {
  status?: string;
  assigned_to?: string;
  priority?: string;
  bucket_id?: string | null;
  limit?: number;
  offset?: number;
}

export const ticketsApi = {
  list: async (filters?: TicketFilters): Promise<Ticket[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.assigned_to) params.append("assigned_to", filters.assigned_to);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.bucket_id !== undefined) {
      if (filters.bucket_id === null) {
        params.append("bucket_id", "null");
      } else {
        params.append("bucket_id", filters.bucket_id);
      }
    }
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("offset", filters.offset.toString());

    const query = params.toString();
    return apiClient.get<Ticket[]>(`/tickets${query ? `?${query}` : ""}`);
  },

  getById: async (id: string): Promise<Ticket> => {
    return apiClient.get<Ticket>(`/tickets/${id}`);
  },

  create: async (data: {
    subject: string;
    priority?: string;
    source?: string;
    required_skill?: string | null;
    bucket_id?: string | null;
    parent_ticket_id?: string | null;
    observer_ids?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<Ticket> => {
    return apiClient.post<Ticket>("/tickets", data);
  },

  createChild: async (
    parentTicketId: string,
    data: {
      subject: string;
      priority?: string;
      source?: string;
      required_skill?: string | null;
      bucket_id?: string | null;
      observer_ids?: string[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<Ticket> => {
    return apiClient.post<Ticket>(`/tickets/${parentTicketId}/children`, data);
  },

  update: async (
    id: string,
    data: {
      status?: string;
      priority?: string;
      assigned_to?: string | null;
      subject?: string;
      required_skill?: string | null;
      bucket_id?: string | null;
      parent_ticket_id?: string | null;
    },
  ): Promise<Ticket> => {
    return apiClient.patch<Ticket>(`/tickets/${id}`, data);
  },

  getMessages: async (ticketId: string): Promise<TicketMessage[]> => {
    return apiClient.get<TicketMessage[]>(`/tickets/${ticketId}/messages`);
  },

  addMessage: async (
    ticketId: string,
    data: { content: string; is_private?: boolean },
  ): Promise<TicketMessage> => {
    return apiClient.post<TicketMessage>(`/tickets/${ticketId}/messages`, data);
  },

  getObservers: async (ticketId: string): Promise<{ observers: string[] }> => {
    return apiClient.get<{ observers: string[] }>(`/tickets/${ticketId}/observers`);
  },

  addObservers: async (
    ticketId: string,
    user_ids: string[],
  ): Promise<{ observers: string[] }> => {
    return apiClient.post<{ observers: string[] }>(`/tickets/${ticketId}/observers`, {
      user_ids,
    });
  },

  removeObservers: async (
    ticketId: string,
    user_ids: string[],
  ): Promise<{ observers: string[] }> => {
    return apiClient.delete<{ observers: string[] }>(`/tickets/${ticketId}/observers`, {
      data: { user_ids },
    } as any);
  },

  setObservers: async (
    ticketId: string,
    user_ids: string[],
  ): Promise<{ observers: string[] }> => {
    return apiClient.put<{ observers: string[] }>(`/tickets/${ticketId}/observers`, {
      user_ids,
    });
  },
};

