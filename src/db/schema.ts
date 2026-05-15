import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  isTemplate: integer("is_template", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(new Date()),
});

export const documentsRelations = relations(documents, ({ many }) => ({
  fields: many(fields),
  sessions: many(sessions),
}));

export const fields = sqliteTable("fields", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["signature", "text", "date", "checkbox"],
  }).notNull(),
  page: integer("page").notNull(),
  x: integer("x").notNull(),
  y: integer("y").notNull(),
  width: integer("width").notNull().default(200),
  height: integer("height").notNull().default(50),
});

export const fieldsRelations = relations(fields, ({ one, many }) => ({
  document: one(documents, {
    fields: [fields.documentId],
    references: [documents.id],
  }),
  signatures: many(signatures),
}));

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "completed"] })
    .notNull()
    .default("pending"),
  signerName: text("signer_name"),
  signerEmail: text("signer_email"),
  signerIp: text("signer_ip"),
  signerUserAgent: text("signer_user_agent"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(new Date()),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  document: one(documents, {
    fields: [sessions.documentId],
    references: [documents.id],
  }),
  signatures: many(signatures),
}));

export const signatures = sqliteTable("signatures", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  fieldId: text("field_id")
    .notNull()
    .references(() => fields.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
});

export const signaturesRelations = relations(signatures, ({ one }) => ({
  session: one(sessions, {
    fields: [signatures.sessionId],
    references: [sessions.id],
  }),
  field: one(fields, {
    fields: [signatures.fieldId],
    references: [fields.id],
  }),
}));
