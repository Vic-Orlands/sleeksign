import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  workspaceId: text("workspace_id"),
  signerRoles: text("signer_roles").notNull().default('["HR","Employee","Contractor"]'),
  roleConfigs: text("role_configs")
    .notNull()
    .default('[{"name":"HR","scope":"private"},{"name":"Employee","scope":"private"},{"name":"Contractor","scope":"private"}]'),
  isTemplate: integer("is_template", { mode: "boolean" })
    .notNull()
    .default(false),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(new Date()),
});

export const documentsRelations = relations(documents, ({ many }) => ({
  fields: many(fields),
  sessions: many(sessions),
  packets: many(signingPackets),
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
  // Storing as percentages (0-100) for responsive scaling
  x: real("x").notNull(),
  y: real("y").notNull(),
  width: real("width").notNull().default(20),
  height: real("height").notNull().default(5),
  required: integer("required", { mode: "boolean" }).notNull().default(true),
  assigneeRole: text("assignee_role").notNull().default("HR"),
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
  signerRole: text("signer_role"),
  signerIp: text("signer_ip"),
  signerUserAgent: text("signer_user_agent"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
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

export const signingPackets = sqliteTable("signing_packets", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  roleConfigs: text("role_configs").notNull(),
  status: text("status").notNull().default("active"),
  finalizedFileUrl: text("finalized_file_url"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(new Date()),
});

export const signingPacketsRelations = relations(signingPackets, ({ one, many }) => ({
  document: one(documents, {
    fields: [signingPackets.documentId],
    references: [documents.id],
  }),
  copies: many(signingPacketCopies),
  values: many(signingPacketValues),
}));

export const signingPacketCopies = sqliteTable("signing_packet_copies", {
  id: text("id").primaryKey(),
  packetId: text("packet_id")
    .notNull()
    .references(() => signingPackets.id, { onDelete: "cascade" }),
  roleName: text("role_name").notNull(),
  signerName: text("signer_name"),
  signerEmail: text("signer_email"),
  status: text("status").notNull().default("pending"),
  finalizedFileUrl: text("finalized_file_url"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(new Date()),
});

export const signingPacketCopiesRelations = relations(
  signingPacketCopies,
  ({ one, many }) => ({
    packet: one(signingPackets, {
      fields: [signingPacketCopies.packetId],
      references: [signingPackets.id],
    }),
    values: many(signingPacketValues),
  }),
);

export const signingPacketValues = sqliteTable("signing_packet_values", {
  id: text("id").primaryKey(),
  packetId: text("packet_id")
    .notNull()
    .references(() => signingPackets.id, { onDelete: "cascade" }),
  copyId: text("copy_id").references(() => signingPacketCopies.id, {
    onDelete: "cascade",
  }),
  fieldId: text("field_id")
    .notNull()
    .references(() => fields.id, { onDelete: "cascade" }),
  roleName: text("role_name").notNull(),
  value: text("value").notNull(),
  signerName: text("signer_name"),
  signerEmail: text("signer_email"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(new Date()),
});

export const signingPacketValuesRelations = relations(
  signingPacketValues,
  ({ one }) => ({
    packet: one(signingPackets, {
      fields: [signingPacketValues.packetId],
      references: [signingPackets.id],
    }),
    copy: one(signingPacketCopies, {
      fields: [signingPacketValues.copyId],
      references: [signingPacketCopies.id],
    }),
    field: one(fields, {
      fields: [signingPacketValues.fieldId],
      references: [fields.id],
    }),
  }),
);

export const authUser = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  lastWorkspaceId: text("last_workspace_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const authSession = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
});

export const authAccount = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const authVerification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const authOrganization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const authMember = sqliteTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const authInvitation = sqliteTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
