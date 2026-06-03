import {
  boolean,
  integer,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  storageKey: text("storage_key"),
  storageProvider: text("storage_provider").notNull().default("r2"),
  uploadStatus: text("upload_status")
    .$type<"pending_upload" | "ready" | "failed">()
    .notNull()
    .default("ready"),
  fileSize: integer("file_size"),
  contentType: text("content_type"),
  workspaceId: text("workspace_id"),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  signerRoles: text("signer_roles")
    .notNull()
    .default('["HR","Employee","Contractor"]'),
  roleConfigs: text("role_configs")
    .notNull()
    .default(
      '[{"name":"HR","scope":"private"},{"name":"Employee","scope":"private"},{"name":"Contractor","scope":"private"}]',
    ),
  requireOtp: boolean("require_otp").notNull().default(false),
  isTemplate: boolean("is_template").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: false }),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

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
  assigneeRole: text("assignee_role").notNull().default(""),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  status: text("status")
    .$type<"pending" | "completed">()
    .notNull()
    .default("pending"),
  signerName: text("signer_name"),
  signerEmail: text("signer_email"),
  signerRole: text("signer_role"),
  signerIp: text("signer_ip"),
  signerUserAgent: text("signer_user_agent"),
  verificationRequired: boolean("verification_required")
    .notNull()
    .default(false),
  verificationMode: text("verification_mode").notNull().default("none"),
  evidenceSnapshot: text("evidence_snapshot"),
  certificateId: text("certificate_id"),
  certificateHash: text("certificate_hash"),
  finalizedFileUrl: text("finalized_file_url"),
  finalizedStorageKey: text("finalized_storage_key"),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

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

export const signingPackets = pgTable("signing_packets", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  mode: text("mode")
    .$type<"collaborative" | "individual" | "shared-base">()
    .notNull(),
  roleConfigs: text("role_configs").notNull(),
  requireOtp: boolean("require_otp").notNull().default(false),
  verificationMode: text("verification_mode").notNull().default("none"),
  status: text("status")
    .$type<"active" | "completed">()
    .notNull()
    .default("active"),
  finalizedFileUrl: text("finalized_file_url"),
  finalizedStorageKey: text("finalized_storage_key"),
  evidenceSnapshot: text("evidence_snapshot"),
  certificateId: text("certificate_id"),
  certificateHash: text("certificate_hash"),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const signingPacketCopies = pgTable("signing_packet_copies", {
  id: text("id").primaryKey(),
  packetId: text("packet_id")
    .notNull()
    .references(() => signingPackets.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  roleName: text("role_name").notNull(),
  signerName: text("signer_name"),
  signerEmail: text("signer_email"),
  recipientType: text("recipient_type")
    .$type<"email" | "signer" | "group" | "bulk">()
    .default("email"),
  recipientSourceId: text("recipient_source_id"),
  status: text("status")
    .$type<"pending" | "completed">()
    .notNull()
    .default("pending"),
  finalizedFileUrl: text("finalized_file_url"),
  finalizedStorageKey: text("finalized_storage_key"),
  evidenceSnapshot: text("evidence_snapshot"),
  certificateId: text("certificate_id"),
  certificateHash: text("certificate_hash"),
  bulkSendJobId: text("bulk_send_job_id"),
  bulkSendRowId: text("bulk_send_row_id"),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

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

export const permissionRoles = pgTable("permission_roles", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }),
  scope: text("scope").$type<"organization" | "team">().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  systemKey: text("system_key"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const permissionRolePermissions = pgTable("permission_role_permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id")
    .notNull()
    .references(() => permissionRoles.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  memberId: text("member_id")
    .notNull()
    .references(() => authMember.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const memberRoleAssignments = pgTable("member_role_assignments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  memberId: text("member_id")
    .notNull()
    .references(() => authMember.id, { onDelete: "cascade" }),
  roleId: text("role_id")
    .notNull()
    .references(() => permissionRoles.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const workspaceSigners = pgTable("workspace_signers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  title: text("title"),
  type: text("type")
    .$type<"internal" | "external">()
    .notNull()
    .default("internal"),
  status: text("status")
    .$type<"active" | "archived">()
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const signerGroups = pgTable("signer_groups", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const signerGroupMembers = pgTable("signer_group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => signerGroups.id, { onDelete: "cascade" }),
  signerId: text("signer_id")
    .notNull()
    .references(() => workspaceSigners.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const organizationBranding = pgTable("organization_branding", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#18181b"),
  secondaryColor: text("secondary_color").notNull().default("#f97316"),
  neutralColor: text("neutral_color").notNull().default("#f7f5f1"),
  accentColor: text("accent_color").notNull().default("#ea580c"),
  bodyFont: text("body_font").notNull().default("Roboto"),
  signatureFont: text("signature_font").notNull().default("Ruthie"),
  senderName: text("sender_name").notNull().default("SleekSign"),
  supportEmail: text("support_email"),
  supportLabel: text("support_label").notNull().default("Support"),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const customDomains = pgTable("custom_domains", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  hostname: text("hostname").notNull(),
  status: text("status")
    .$type<"pending" | "verified" | "failed">()
    .notNull()
    .default("pending"),
  verificationToken: text("verification_token").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  workspaceId: text("workspace_id"),
  documentId: text("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
  packetId: text("packet_id").references(() => signingPackets.id, {
    onDelete: "set null",
  }),
  packetCopyId: text("packet_copy_id").references(() => signingPacketCopies.id, {
    onDelete: "set null",
  }),
  sessionId: text("session_id").references(() => sessions.id, {
    onDelete: "set null",
  }),
  bulkSendJobId: text("bulk_send_job_id"),
  actorType: text("actor_type").$type<"user" | "signer" | "system">().notNull(),
  actorId: text("actor_id"),
  actorEmail: text("actor_email"),
  eventType: text("event_type").notNull(),
  chainKey: text("chain_key").notNull(),
  requestId: text("request_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  payload: text("payload").notNull().default("{}"),
  eventHash: text("event_hash").notNull(),
  previousEventHash: text("previous_event_hash"),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const signerVerificationChallenges = pgTable(
  "signer_verification_challenges",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => authOrganization.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    documentId: text("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    packetId: text("packet_id").references(() => signingPackets.id, {
      onDelete: "cascade",
    }),
    copyId: text("copy_id").references(() => signingPacketCopies.id, {
      onDelete: "cascade",
    }),
    sessionId: text("session_id").references(() => sessions.id, {
      onDelete: "cascade",
    }),
    roleName: text("role_name"),
    recipientEmail: text("recipient_email").notNull(),
    codeHash: text("code_hash").notNull(),
    verificationToken: text("verification_token"),
    expiresAt: timestamp("expires_at", { withTimezone: false }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastSentAt: timestamp("last_sent_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: false }),
    createdAt: timestamp("created_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
);

export const bulkSendJobs = pgTable("bulk_send_jobs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  packetId: text("packet_id").references(() => signingPackets.id, {
    onDelete: "set null",
  }),
  mode: text("mode")
    .$type<"collaborative" | "individual" | "shared-base">()
    .notNull(),
  status: text("status")
    .$type<"draft" | "sending" | "sent" | "completed" | "failed">()
    .notNull()
    .default("draft"),
  roleName: text("role_name"),
  csvFileName: text("csv_file_name").notNull(),
  mapping: text("mapping").notNull().default("{}"),
  sendImmediately: boolean("send_immediately").notNull().default(false),
  totalRows: integer("total_rows").notNull().default(0),
  createdCount: integer("created_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  viewedCount: integer("viewed_count").notNull().default(0),
  signedCount: integer("signed_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdByMemberId: text("created_by_member_id")
    .notNull()
    .references(() => authMember.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const bulkSendRows = pgTable("bulk_send_rows", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => bulkSendJobs.id, { onDelete: "cascade" }),
  packetCopyId: text("packet_copy_id").references(() => signingPacketCopies.id, {
    onDelete: "set null",
  }),
  rowIndex: integer("row_index").notNull(),
  roleName: text("role_name").notNull(),
  signerName: text("signer_name"),
  signerEmail: text("signer_email").notNull(),
  status: text("status")
    .$type<"draft" | "created" | "sent" | "viewed" | "signed" | "failed" | "cancelled">()
    .notNull()
    .default("draft"),
  shareUrl: text("share_url"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const recipientImportErrors = pgTable("recipient_import_errors", {
  id: text("id").primaryKey(),
  jobId: text("job_id")
    .notNull()
    .references(() => bulkSendJobs.id, { onDelete: "cascade" }),
  rowIndex: integer("row_index").notNull(),
  columnName: text("column_name"),
  message: text("message").notNull(),
  rawValue: text("raw_value"),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

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

export const documentsRelations = relations(documents, ({ one, many }) => ({
  team: one(teams, {
    fields: [documents.teamId],
    references: [teams.id],
  }),
  fields: many(fields),
  sessions: many(sessions),
  packets: many(signingPackets),
}));

export const fieldsRelations = relations(fields, ({ one, many }) => ({
  document: one(documents, {
    fields: [fields.documentId],
    references: [documents.id],
  }),
  signatures: many(signatures),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  document: one(documents, {
    fields: [sessions.documentId],
    references: [documents.id],
  }),
  team: one(teams, {
    fields: [sessions.teamId],
    references: [teams.id],
  }),
  signatures: many(signatures),
}));

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

export const signingPacketsRelations = relations(
  signingPackets,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [signingPackets.documentId],
      references: [documents.id],
    }),
    team: one(teams, {
      fields: [signingPackets.teamId],
      references: [teams.id],
    }),
    copies: many(signingPacketCopies),
    values: many(signingPacketValues),
  }),
);

export const signingPacketCopiesRelations = relations(
  signingPacketCopies,
  ({ one, many }) => ({
    packet: one(signingPackets, {
      fields: [signingPacketCopies.packetId],
      references: [signingPackets.id],
    }),
    team: one(teams, {
      fields: [signingPacketCopies.teamId],
      references: [teams.id],
    }),
    values: many(signingPacketValues),
  }),
);

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

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(authOrganization, {
    fields: [teams.organizationId],
    references: [authOrganization.id],
  }),
  documents: many(documents),
  sessions: many(sessions),
  packets: many(signingPackets),
  copies: many(signingPacketCopies),
  memberships: many(teamMembers),
  signers: many(workspaceSigners),
  signerGroups: many(signerGroups),
}));

export const workspaceSignersRelations = relations(
  workspaceSigners,
  ({ one, many }) => ({
    organization: one(authOrganization, {
      fields: [workspaceSigners.organizationId],
      references: [authOrganization.id],
    }),
    team: one(teams, {
      fields: [workspaceSigners.teamId],
      references: [teams.id],
    }),
    groupMemberships: many(signerGroupMembers),
  }),
);

export const signerGroupsRelations = relations(signerGroups, ({ one, many }) => ({
  organization: one(authOrganization, {
    fields: [signerGroups.organizationId],
    references: [authOrganization.id],
  }),
  team: one(teams, {
    fields: [signerGroups.teamId],
    references: [teams.id],
  }),
  members: many(signerGroupMembers),
}));

export const signerGroupMembersRelations = relations(
  signerGroupMembers,
  ({ one }) => ({
    group: one(signerGroups, {
      fields: [signerGroupMembers.groupId],
      references: [signerGroups.id],
    }),
    signer: one(workspaceSigners, {
      fields: [signerGroupMembers.signerId],
      references: [workspaceSigners.id],
    }),
  }),
);
