import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "pending",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const ticketSourceEnum = pgEnum("ticket_source", ["email", "web", "api"]);

export const orgTierEnum = pgEnum("org_tier", ["free", "pro", "enterprise"]);

export const roleNameEnum = pgEnum("role_name", ["admin", "agent", "customer"]);

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tier: orgTierEnum("tier").notNull().default("free"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: roleNameEnum("name").notNull().unique(),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    org_id: text("org_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    name: text("name").notNull(),
    password_hash: text("password_hash").notNull(),
    skills: jsonb("skills").$type<string[]>().default([]),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    orgUserIdx: index("org_user_idx").on(table.org_id, table.id),
    emailIdx: index("email_idx").on(table.email),
  }),
);

export const userRoles = pgTable("user_roles", {
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role_id: text("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const tickets = pgTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    org_id: text("org_id")
      .notNull()
      .references(() => organizations.id),
    ticket_number: text("ticket_number").notNull().unique(),
    subject: text("subject").notNull(),
    status: ticketStatusEnum("status").notNull().default("open"),
    priority: ticketPriorityEnum("priority").notNull().default("medium"),
    source: ticketSourceEnum("source").notNull().default("web"),
    required_skill: text("required_skill"),
    bucket_id: text("bucket_id").references(() => buckets.id),
    parent_ticket_id: text("parent_ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    assigned_to: text("assigned_to").references(() => users.id),
    created_by: text("created_by")
      .notNull()
      .references(() => users.id),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    custom_fields: jsonb("custom_fields").$type<Record<string, unknown>>().default({}),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    orgStatusIdx: index("org_status_idx").on(table.org_id, table.status),
    ticketNumberIdx: index("ticket_number_idx").on(table.ticket_number),
    createdAtIdx: index("created_at_idx").on(table.created_at),
    bucketIdx: index("bucket_idx").on(table.bucket_id),
    parentTicketIdx: index("parent_ticket_idx").on(table.parent_ticket_id),
  }),
);

export const ticketObservers = pgTable(
  "ticket_observers",
  {
    ticket_id: text("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    ticketObserverIdx: index("ticket_observer_idx").on(table.ticket_id, table.user_id),
    ticketIdx: index("ticket_observer_ticket_idx").on(table.ticket_id),
    userIdx: index("ticket_observer_user_idx").on(table.user_id),
  }),
);

export const ticketMessages = pgTable("ticket_messages", {
  id: text("id").primaryKey(),
  ticket_id: text("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  is_private: boolean("is_private").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  ticket_id: text("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  message_id: text("message_id").references(() => ticketMessages.id, {
    onDelete: "cascade",
  }),
  file_name: text("file_name").notNull(),
  file_size: integer("file_size").notNull(),
  mime_type: text("mime_type").notNull(),
  s3_key: text("s3_key").notNull(),
  uploaded_by: text("uploaded_by")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const automationRules = pgTable("automation_rules", {
  id: text("id").primaryKey(),
  org_id: text("org_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  priority: integer("priority").notNull().default(0),
  conditions: jsonb("conditions").$type<Array<{
    field: string;
    operator: string;
    value: unknown;
  }>>().notNull(),
  actions: jsonb("actions").$type<Array<{
    type: string;
    params: Record<string, unknown>;
  }>>().notNull(),
  enabled: boolean("enabled").notNull().default(true),
  is_default: boolean("is_default").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const slaPolicies = pgTable("sla_policies", {
  id: text("id").primaryKey(),
  org_id: text("org_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  response_time_hours: integer("response_time_hours").notNull(),
  resolution_time_hours: integer("resolution_time_hours").notNull(),
  priority: ticketPriorityEnum("priority").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const buckets = pgTable(
  "buckets",
  {
    id: text("id").primaryKey(),
    org_id: text("org_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    tag: text("tag"),
    description: text("description"),
    color: text("color"),
    custom_fields: jsonb("custom_fields").$type<Array<{
      key: string;
      label: string;
      type: "text" | "number" | "date" | "select" | "textarea" | "boolean";
      required?: boolean;
      options?: string[];
      placeholder?: string;
    }>>().default([]),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    orgBucketIdx: index("org_bucket_idx").on(table.org_id, table.id),
    nameIdx: index("bucket_name_idx").on(table.name),
  }),
);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  org_id: text("org_id")
    .notNull()
    .references(() => organizations.id),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  resource_type: text("resource_type").notNull(),
  resource_id: text("resource_id").notNull(),
  before_state: jsonb("before_state").$type<Record<string, unknown>>(),
  after_state: jsonb("after_state").$type<Record<string, unknown>>(),
  ip_address: text("ip_address"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

