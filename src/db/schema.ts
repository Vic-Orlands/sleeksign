import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const teams = pgTable(
  "teams",
  {
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
  },
  (table) => [
    uniqueIndex("teams_organization_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
    index("teams_organization_idx").on(table.organizationId),
  ],
);

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
  workspaceId: text("workspace_id").references(() => authOrganization.id, {
    onDelete: "cascade",
  }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  signerRoles: text("signer_roles")
    .notNull()
    .default('["Owner","Employee","Contractor"]'),
  roleConfigs: text("role_configs")
    .notNull()
    .default(
      '[{"name":"Owner","scope":"private"},{"name":"Employee","scope":"private"},{"name":"Contractor","scope":"private"}]',
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
}, (table) => [
  index("documents_workspace_idx").on(table.workspaceId),
  index("documents_team_idx").on(table.teamId),
]);

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
}, (table) => [index("fields_document_idx").on(table.documentId)]);

export const signingPackets = pgTable(
  "signing_packets",
  {
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
    status: text("status")
      .$type<"active" | "completed">()
      .notNull()
      .default("active"),
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
  },
  (table) => [
    index("signing_packets_document_idx").on(table.documentId),
    index("signing_packets_workspace_idx").on(table.workspaceId),
  ],
);

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
  bulkSendJobId: text("bulk_send_job_id").references(
    (): AnyPgColumn => bulkSendJobs.id,
    { onDelete: "set null" },
  ),
  bulkSendRowId: text("bulk_send_row_id").references(
    (): AnyPgColumn => bulkSendRows.id,
    { onDelete: "set null" },
  ),
  completedAt: timestamp("completed_at", { withTimezone: false }),
  deletedAt: timestamp("deleted_at", { withTimezone: false }),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("signing_packet_copies_packet_idx").on(table.packetId),
  index("signing_packet_copies_team_idx").on(table.teamId),
  index("signing_packet_copies_bulk_job_idx").on(table.bulkSendJobId),
]);

export const signingPacketValues = pgTable(
  "signing_packet_values",
  {
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
  },
  (table) => [
    uniqueIndex("signing_packet_values_shared_field_unique")
      .on(table.packetId, table.fieldId)
      .where(sql`${table.copyId} is null`),
    uniqueIndex("signing_packet_values_copy_field_unique")
      .on(table.copyId, table.fieldId)
      .where(sql`${table.copyId} is not null`),
    index("signing_packet_values_packet_idx").on(table.packetId),
    index("signing_packet_values_copy_idx").on(table.copyId),
  ],
);

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
}, (table) => [
  uniqueIndex("team_members_team_member_unique").on(table.teamId, table.memberId),
  index("team_members_organization_idx").on(table.organizationId),
]);

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
}, (table) => [
  uniqueIndex("workspace_signers_organization_email_unique").on(
    table.organizationId,
    table.email,
  ),
  index("workspace_signers_team_idx").on(table.teamId),
]);

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
}, (table) => [
  index("signer_groups_organization_idx").on(table.organizationId),
  index("signer_groups_team_idx").on(table.teamId),
]);

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
}, (table) => [
  uniqueIndex("signer_group_members_group_signer_unique").on(
    table.groupId,
    table.signerId,
  ),
]);

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
}, (table) => [
  uniqueIndex("organization_branding_organization_unique").on(
    table.organizationId,
  ),
]);

export const customDomains = pgTable("custom_domains", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
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
}, (table) => [
  uniqueIndex("custom_domains_hostname_unique").on(table.hostname),
  index("custom_domains_organization_idx").on(table.organizationId),
]);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => authOrganization.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  documentId: text("document_id").references(() => documents.id, {
    onDelete: "set null",
  }),
  packetId: text("packet_id").references(() => signingPackets.id, {
    onDelete: "set null",
  }),
  packetCopyId: text("packet_copy_id").references(() => signingPacketCopies.id, {
    onDelete: "set null",
  }),
  bulkSendJobId: text("bulk_send_job_id").references(
    (): AnyPgColumn => bulkSendJobs.id,
    { onDelete: "set null" },
  ),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("audit_logs_organization_created_idx").on(
    table.organizationId,
    table.createdAt,
  ),
  index("audit_logs_chain_created_idx").on(table.chainKey, table.createdAt),
]);

export const documentVerifications = pgTable(
  "document_verifications",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => authOrganization.id, { onDelete: "cascade" }),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    artifactType: text("artifact_type")
      .$type<"session" | "packet" | "copy">()
      .notNull(),
    artifactId: text("artifact_id").notNull(),
    status: text("status").$type<"active" | "revoked">().notNull().default("active"),
    sourceDocumentHash: text("source_document_hash").notNull(),
    finalizedDocumentHash: text("finalized_document_hash").notNull(),
    manifest: text("manifest").notNull(),
    manifestHash: text("manifest_hash").notNull(),
    signature: text("signature").notNull(),
    signatureAlgorithm: text("signature_algorithm").notNull(),
    keyVersion: text("key_version").notNull(),
    publicKeyFingerprint: text("public_key_fingerprint").notNull(),
    auditChainKey: text("audit_chain_key").notNull(),
    auditRootHash: text("audit_root_hash").notNull(),
    auditEventCount: integer("audit_event_count").notNull(),
    finalizedStorageKey: text("finalized_storage_key").notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("document_verifications_artifact_unique").on(
      table.artifactType,
      table.artifactId,
    ),
    index("document_verifications_document_idx").on(table.documentId),
    index("document_verifications_finalized_hash_idx").on(
      table.finalizedDocumentHash,
    ),
  ],
);

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
    roleName: text("role_name"),
    signerName: text("signer_name"),
    recipientEmail: text("recipient_email").notNull(),
    verificationMethod: text("verification_method")
      .$type<"identity" | "email_otp">()
      .notNull()
      .default("email_otp"),
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
  (table) => [
    index("signer_challenges_packet_role_idx").on(
      table.packetId,
      table.roleName,
    ),
    index("signer_challenges_copy_idx").on(table.copyId),
    index("signer_challenges_expires_idx").on(table.expiresAt),
  ],
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
}, (table) => [
  index("bulk_send_jobs_organization_idx").on(table.organizationId),
  index("bulk_send_jobs_document_idx").on(table.documentId),
]);

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
}, (table) => [
  uniqueIndex("bulk_send_rows_job_row_unique").on(table.jobId, table.rowIndex),
  index("bulk_send_rows_packet_copy_idx").on(table.packetCopyId),
]);

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
  lastWorkspaceId: text("last_workspace_id").references(
    () => authOrganization.id,
    { onDelete: "set null" },
  ),
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
  activeOrganizationId: text("active_organization_id").references(
    () => authOrganization.id,
    { onDelete: "set null" },
  ),
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
}, (table) => [
  uniqueIndex("member_organization_user_unique").on(
    table.organizationId,
    table.userId,
  ),
]);

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
  packets: many(signingPackets),
  verifications: many(documentVerifications),
}));

export const documentVerificationsRelations = relations(
  documentVerifications,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentVerifications.documentId],
      references: [documents.id],
    }),
    organization: one(authOrganization, {
      fields: [documentVerifications.organizationId],
      references: [authOrganization.id],
    }),
    team: one(teams, {
      fields: [documentVerifications.teamId],
      references: [teams.id],
    }),
  }),
);

export const fieldsRelations = relations(fields, ({ one }) => ({
  document: one(documents, {
    fields: [fields.documentId],
    references: [documents.id],
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
