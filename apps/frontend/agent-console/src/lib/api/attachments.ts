import { apiClient } from "./client";
import type { Attachment } from "@/types";

export interface PresignedUrlResponse {
  url: string;
  s3_key: string;
}

export const attachmentsApi = {
  getPresignedUrl: async (
    ticketId: string,
    data: {
      file_name: string;
      file_size: number;
      mime_type: string;
    },
  ): Promise<PresignedUrlResponse> => {
    return apiClient.post<PresignedUrlResponse>(
      `/tickets/${ticketId}/attachments/presigned`,
      data,
    );
  },

  create: async (
    ticketId: string,
    data: {
      file_name: string;
      file_size: number;
      mime_type: string;
      s3_key: string;
      message_id?: string;
    },
  ): Promise<Attachment> => {
    return apiClient.post<Attachment>(`/tickets/${ticketId}/attachments`, data);
  },

  getDownloadUrl: async (attachmentId: string): Promise<{ url: string }> => {
    return apiClient.get<{ url: string }>(`/tickets/attachments/${attachmentId}/url`);
  },
};

