import {
  boolean,
  integer,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  workspaceId: text("workspace_id"),
  signerRoles: text("signer_roles")
    .notNull()
    .default('["HR","Employee","Contractor"]'),
  roleConfigs: text("role_configs")
    .notNull()
    .default(
      '[{"name":"HR","scope":"private"},{"name":"Employee","scope":"private"},{"name":"Contractor","scope":"private"}]',
    ),
  isTemplate: boolean("is_template").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: false }),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const documentsRelations = relations(documents, ({ many }) => ({
  fields: many(fields),
  sessions: many(sessions),
  packets: many(signingPackets),
}));

export const fields = pgTable("fields", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  type: text("type")
    .$type<"signature" | "text" | "date" | "checkbox">()
    .notNull(),
  page: integer("page").notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  width: real("width").notNull().default(20),
  height: real("height").notNull().default(5),
  required: boolean("required").notNull().default(true),
  assigneeRole: text("assignee_role").notNull().default("HR"),
});

export const fieldsRelations = relations(fields, ({ one, many }) => ({
  document: one(documents, {
    fields: [fields.documentId],
    references: [documents.id],
  }),
  signatures: many(signatures),
}));

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  status: text("status").$type<"pending" | "completed">().notNull().default("pending"),
  signerName: text("signer_name"),
  signerEmail: text("signer_email"),
  signerRole: text("signer_role"),
  signerIp: text("signer_ip"),
  signerUserAgent: text("signer_user_agent"),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  document: one(documents, {
    fields: [sessions.documentId],
    references: [documents.id],
  }),
  signatures: many(signatures),
}));

export const signatures = pgTable("signatures", {
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

export const signingPackets = pgTable("signing_packets", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  mode: text("mode")
    .$type<"collaborative" | "individual" | "shared-base">()
    .notNull(),
  roleConfigs: text("role_configs").notNull(),
  status: text("status")
    .$type<"active" | "completed">()
    .notNull()
    .default("active"),
  finalizedFileUrl: text("finalized_file_url"),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const signingPacketsRelations = relations(
  signingPackets,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [signingPackets.documentId],
      references: [documents.id],
    }),
    copies: many(signingPacketCopies),
    values: many(signingPacketValues),
  }),
);

export const signingPacketCopies = pgTable("signing_packet_copies", {
  id: text("id").primaryKey(),
  packetId: text("packet_id")
    .notNull()
    .references(() => signingPackets.id, { onDelete: "cascade" }),
  roleName: text("role_name").notNull(),
  signerName: text("signer_name"),
  signerEmail: text("signer_email"),
  status: text("status").$type<"pending" | "completed">().notNull().default("pending"),
  finalizedFileUrl: text("finalized_file_url"),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
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

export const signingPacketValues = pgTable("signing_packet_values", {
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
  completedAt: timestamp("completed_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
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

export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  lastWorkspaceId: text("last_workspace_id"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
});

export const authSession = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  activeOrganizationId: text("active_organization_id"),
});

export const authAccount = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: false,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: false,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false }).notNull(),
});

export const authVerification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }),
  updatedAt: timestamp("updated_at", { withTimezone: false }),
});

export const authOrganization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
});

export const authMember = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
});

export const authInvitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull(),
});
