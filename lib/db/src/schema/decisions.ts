import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { integer, jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const decisionsTable = pgTable("decisions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  organization: text("organization"),
  item: text("item"),
  material: text("material"),
  quantity: integer("quantity").default(1),
  price: numeric("price"),
  currency: text("currency").default("USD"),
  location: text("location"),
  useCase: text("use_case"),
  currentOption: text("current_option"),
  fileName: text("file_name"),
  objectPath: text("object_path"),
  contentType: text("content_type"),
  sourceText: text("source_text").notNull().default(""),
  parsedData: jsonb("parsed_data").notNull().default({}),
  analysis: jsonb("analysis").notNull().default({}),
  assumptions: jsonb("assumptions").notNull().default({}),
  impact: jsonb("impact").notNull().default({}),
  alternatives: jsonb("alternatives").notNull().default([]),
  evidence: jsonb("evidence").notNull().default([]),
  missingData: jsonb("missing_data").notNull().default([]),
  firewallFlags: jsonb("firewall_flags").notNull().default([]),
  status: text("status").notNull().default("intake"),
  reviewNotes: text("review_notes"),
  reviewer: text("reviewer"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  selectedAlternative: text("selected_alternative"),
  ownerId: text("owner_id").default("default-user"),
  shareId: text("share_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  decisionId: integer("decision_id").notNull(),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull().default("system"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectDecisionSchema = createSelectSchema(decisionsTable);
export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisionsTable.$inferSelect;
export type AuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

