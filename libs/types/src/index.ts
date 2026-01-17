export interface User {
  id: string;
  org_id: string;
  email: string;
  name: string;
  password_hash: string;
  skills: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface Organization {
  id: string;
  name: string;
  tier: "free" | "pro" | "enterprise";
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface Role {
  id: string;
  name: "admin" | "agent" | "customer";
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  created_at: Date;
}

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
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TicketObserver {
  ticket_id: string;
  user_id: string;
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_private: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
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
  created_at: Date;
}

export interface AutomationRule {
  id: string;
  org_id: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled: boolean;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RuleCondition {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "in" | "is_null" | "is_not_null" | "not_equals" | "starts_with" | "ends_with";
  value: unknown;
}

export interface RuleAction {
  type: "assign_agent" | "assign_team" | "set_priority" | "send_notification" | "escalate";
  params: Record<string, unknown>;
}

export interface SLAPolicy {
  id: string;
  org_id: string;
  name: string;
  response_time_hours: number;
  resolution_time_hours: number;
  priority: TicketPriority;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
}

export type TicketEventType =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.assigned"
  | "ticket.replied"
  | "ticket.closed";

export interface TicketEvent {
  event_type: TicketEventType;
  org_id: string;
  user_id: string;
  timestamp: string;
  data: {
    ticket_id: string;
    ticket_number?: string;
    [key: string]: unknown;
  };
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface JwtPayload {
  user_id: string;
  org_id: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

