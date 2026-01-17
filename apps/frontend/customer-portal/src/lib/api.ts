const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface ApiError {
  error: string;
  code: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    org_id: string;
    roles: string[];
  };
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  source: "email" | "web" | "api";
  created_by: string;
  assigned_to: string | null;
  required_skill: string | null;
  org_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  s3_key: string;
  uploaded_by: string;
  created_at: string;
}

class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;
  private getRefreshToken: () => string | null;
  private onTokenRefresh?: (tokens: LoginResponse) => void;

  constructor(
    getToken: () => string | null,
    getRefreshToken?: () => string | null,
    onTokenRefresh?: (tokens: LoginResponse) => void
  ) {
    this.baseUrl = API_BASE_URL;
    this.getToken = getToken;
    this.getRefreshToken = getRefreshToken || (() => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("refreshToken");
      }
      return null;
    });
    this.onTokenRefresh = onTokenRefresh;
  }

  private async refreshAccessToken(): Promise<LoginResponse | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await this.request<LoginResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }, false); // Don't retry refresh token calls

      if (this.onTokenRefresh) {
        this.onTokenRefresh(response);
      }

      return response;
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Clear tokens on refresh failure
      if (typeof window !== "undefined") {
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401: boolean = true
  ): Promise<T> {
    const token = this.getToken();
    
    // Convert headers to a plain object to ensure we can modify it
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Merge existing headers if they exist
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    // Always set Authorization if token exists, overriding any existing value
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          error: "An error occurred",
          code: "UNKNOWN_ERROR",
        }));
        
        // For 401 errors, try to refresh token if retry is enabled
        if (response.status === 401 && retryOn401) {
          const newTokens = await this.refreshAccessToken();
          if (newTokens) {
            // Retry the request with new token
            const newHeaders = { ...headers };
            newHeaders.Authorization = `Bearer ${newTokens.accessToken}`;
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              ...options,
              headers: newHeaders,
            });

            if (!retryResponse.ok) {
              const retryError: ApiError = await retryResponse.json().catch(() => ({
                error: "An error occurred",
                code: "UNKNOWN_ERROR",
              }));
              throw new Error(retryError.error || "Request failed after token refresh");
            }

            return retryResponse.json();
          } else {
            // Refresh failed, redirect to login
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            throw new Error("Session expired. Please log in again.");
          }
        }
        
        throw new Error(error.error || "Request failed");
      }

      return response.json();
    } catch (error) {
      // Handle network errors (failed to fetch)
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          `Network error: Unable to connect to API at ${this.baseUrl}. ` +
          `Please ensure the API Gateway is running on port 3000.`
        );
      }
      // Re-throw other errors
      throw error;
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    // Don't retry refresh token calls to avoid infinite loops
    return this.request<LoginResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }, false);
  }

  async logout(): Promise<void> {
    await this.request("/auth/logout", {
      method: "POST",
    });
  }

  async getTickets(params?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<Ticket[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.priority) queryParams.append("priority", params.priority);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const query = queryParams.toString();
    return this.request<Ticket[]>(`/tickets${query ? `?${query}` : ""}`);
  }

  async getTicket(id: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${id}`);
  }

  async createTicket(data: {
    subject: string;
    priority?: string;
    source?: string;
    required_skill?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<Ticket> {
    return this.request<Ticket>("/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMessages(ticketId: string): Promise<Message[]> {
    return this.request<Message[]>(`/tickets/${ticketId}/messages`);
  }

  async createMessage(
    ticketId: string,
    content: string,
    isPrivate?: boolean
  ): Promise<Message> {
    return this.request<Message>(`/tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, is_private: isPrivate || false }),
    });
  }

  async generatePresignedUrl(
    ticketId: string,
    fileName: string,
    fileSize: number,
    mimeType: string
  ): Promise<{ url: string; s3_key: string }> {
    return this.request<{ url: string; s3_key: string }>(
      `/tickets/${ticketId}/attachments/presigned`,
      {
        method: "POST",
        body: JSON.stringify({
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
        }),
      }
    );
  }

  async createAttachment(
    ticketId: string,
    data: {
      file_name: string;
      file_size: number;
      mime_type: string;
      s3_key: string;
      message_id?: string;
    }
  ): Promise<Attachment> {
    return this.request<Attachment>(`/tickets/${ticketId}/attachments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAttachmentUrl(attachmentId: string): Promise<{ url: string }> {
    return this.request<{ url: string }>(`/tickets/attachments/${attachmentId}/url`);
  }
}

export const createApiClient = (
  getToken: () => string | null,
  getRefreshToken?: () => string | null,
  onTokenRefresh?: (tokens: LoginResponse) => void
) => new ApiClient(getToken, getRefreshToken, onTokenRefresh);


