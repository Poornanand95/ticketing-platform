export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketSource = "email" | "web" | "api";

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "boolean";
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface Bucket {
  id: string;
  org_id: string;
  name: string;
  tag: string | null;
  description: string | null;
  color: string | null;
  custom_fields?: CustomFieldDefinition[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  ticket_count?: number;
}

export interface Ticket {
  id: string;
  org_id: string;
  ticket_number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  required_skill: string | null;
  bucket_id: string | null;
  parent_ticket_id: string | null;
  assigned_to: string | null;
  created_by: string;
  observers?: string[];
  children?: Ticket[];
  parent?: Ticket;
  metadata: Record<string, unknown>;
  custom_fields?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  messages?: TicketMessage[];
}

export interface TicketMessage {
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

export interface User {
  id: string;
  org_id: string;
  email: string;
  name: string;
  skills: string[];
  is_active: boolean;
  roles?: string[];
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  tier: "free" | "pro" | "enterprise";
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  org_id: string;
  name: string;
  priority: number;
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  actions: Array<{
    type: string;
    params: Record<string, unknown>;
  }>;
  enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Metrics {
  volume: number;
  avgResponseTime: number;
  slaCompliance: number;
  period: {
    start: string;
    end: string;
  };
}

export interface AgentPerformance {
  ticketsHandled: number;
  avgResponseTime: number;
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

export interface ApiError {
  error: string;
  code: string;
}


