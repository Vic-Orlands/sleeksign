import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  bulkSendJobs,
  bulkSendRows,
  documents,
  recipientImportErrors,
} from "@/db/schema";
import { getOrganizationBranding, getWorkspaceBaseUrl } from "@/lib/branding";
import { createPacketCopy, createSigningPacket, getPacket } from "@/lib/signing-workflows";
import { emitAuditEvent } from "@/lib/audit";
import { buildBulkSendInviteEmail } from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send-email";
import type { RoleConfig, WorkflowMode } from "@/lib/field-utils";

type BulkRecipientRow = {
  rowIndex: number;
  signerName: string;
  signerEmail: string;
  roleName: string;
};

type BulkMapping = {
  nameColumn: string;
  emailColumn: string;
  roleColumn?: string;
  defaultRoleName?: string;
};

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

export function parseCsvText(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { headers: [], rows: [] as Record<string, string>[] };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, string>>((result, header, index) => {
      result[header] = values[index] || "";
      return result;
    }, {});
  });

  return { headers, rows };
}

export function buildRecipientRows(
  rows: Record<string, string>[],
  mapping: BulkMapping,
): { recipients: BulkRecipientRow[]; errors: Array<Record<string, string | number>> } {
  const recipients: BulkRecipientRow[] = [];
  const errors: Array<Record<string, string | number>> = [];

  rows.forEach((row, rowIndex) => {
    const signerEmail = String(row[mapping.emailColumn] || "").trim();
    const signerName = String(row[mapping.nameColumn] || "").trim();
    const roleName = String(
      mapping.roleColumn ? row[mapping.roleColumn] || "" : mapping.defaultRoleName || "",
    ).trim();

    if (!signerEmail || !signerName || !roleName) {
      errors.push({
        rowIndex: rowIndex + 2,
        message: "Name, email, and role are required",
        rawValue: JSON.stringify(row),
      });
      return;
    }

    recipients.push({
      rowIndex: rowIndex + 2,
      signerEmail,
      signerName,
      roleName,
    });
  });

  return { recipients, errors };
}

export async function createBulkSendJob(input: {
  organizationId: string;
  teamId?: string | null;
  documentId: string;
  packetId?: string | null;
  mode: WorkflowMode;
  roleConfigs: RoleConfig[];
  createdByMemberId: string;
  csvFileName: string;
  mapping: BulkMapping;
  recipients: BulkRecipientRow[];
  errors: Array<Record<string, string | number>>;
  sendImmediately: boolean;
  requireOtp?: boolean;
}) {
  const jobId = nanoid();
  const packetId =
    input.packetId ||
    (await createSigningPacket(input.documentId, input.mode, input.roleConfigs, {
      workspaceId: input.organizationId,
      teamId: input.teamId || null,
      requireOtp: input.requireOtp ?? false,
    }));

  await db.insert(bulkSendJobs).values({
    id: jobId,
    organizationId: input.organizationId,
    teamId: input.teamId || null,
    documentId: input.documentId,
    packetId,
    mode: input.mode,
    roleName: input.mapping.defaultRoleName || null,
    csvFileName: input.csvFileName,
    mapping: JSON.stringify(input.mapping),
    sendImmediately: input.sendImmediately,
    status: input.sendImmediately ? "sending" : "draft",
    totalRows: input.recipients.length,
    createdByMemberId: input.createdByMemberId,
  });

  if (input.errors.length > 0) {
    await db.insert(recipientImportErrors).values(
      input.errors.map((error) => ({
        id: nanoid(),
        jobId,
        rowIndex: Number(error.rowIndex || 0),
        columnName: null,
        message: String(error.message || "Invalid row"),
        rawValue: String(error.rawValue || ""),
      })),
    );
  }

  await db.insert(bulkSendRows).values(
    input.recipients.map((recipient) => ({
      id: nanoid(),
      jobId,
      rowIndex: recipient.rowIndex,
      roleName: recipient.roleName,
      signerName: recipient.signerName || null,
      signerEmail: recipient.signerEmail,
      status: "draft" as const,
    })),
  );

  return { jobId, packetId };
}

export async function sendBulkSendJob(jobId: string) {
  const job = await db.query.bulkSendJobs.findFirst({
    where: eq(bulkSendJobs.id, jobId),
  });

  if (!job) throw new Error("Bulk send job not found");

  const [packet, doc, rows, branding] = await Promise.all([
    getPacket(job.packetId || ""),
    db.query.documents.findFirst({
      where: eq(documents.id, job.documentId),
    }),
    db.query.bulkSendRows.findMany({
      where: eq(bulkSendRows.jobId, jobId),
    }),
    getOrganizationBranding(job.organizationId),
  ]);

  if (!doc) throw new Error("Document not found");

  const baseUrl = getWorkspaceBaseUrl(
    branding,
    process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      "http://localhost:3000",
  );

  let createdCount = 0;
  let sentCount = 0;
  let failedCount = 0;

  for (const row of rows) {
    try {
      const copyId = await createPacketCopy({
        packetId: packet.id,
        roleName: row.roleName,
        signerName: row.signerName || undefined,
        signerEmail: row.signerEmail,
        teamId: job.teamId || null,
        bulkSendJobId: job.id,
        bulkSendRowId: row.id,
      });

      const shareUrl = `${baseUrl}/sign/packet/${packet.id}?role=${encodeURIComponent(
        row.roleName,
      )}&copyId=${encodeURIComponent(copyId)}`;

      createdCount += 1;

      await db
        .update(bulkSendRows)
        .set({
          packetCopyId: copyId,
          shareUrl,
          status: "created",
          updatedAt: new Date(),
        })
        .where(eq(bulkSendRows.id, row.id));

      if (job.sendImmediately) {
        const message = buildBulkSendInviteEmail({
          branding,
          documentName: doc.name,
          roleName: row.roleName,
          signerName: row.signerName || row.roleName,
          inviteUrl: shareUrl,
        });

        await sendTransactionalEmail({
          to: row.signerEmail,
          subject: message.subject,
          html: message.html,
          text: message.text,
          fromName: branding.senderName,
        });

        sentCount += 1;

        await db
          .update(bulkSendRows)
          .set({
            status: "sent",
            updatedAt: new Date(),
          })
          .where(eq(bulkSendRows.id, row.id));
      }

      await emitAuditEvent({
        organizationId: job.organizationId,
        teamId: job.teamId,
        workspaceId: job.organizationId,
        documentId: job.documentId,
        packetId: job.packetId,
        packetCopyId: copyId,
        bulkSendJobId: job.id,
        actorType: "system",
        actorEmail: row.signerEmail,
        eventType: job.sendImmediately ? "bulk-send.sent" : "bulk-send.drafted",
        chainKey: `bulk-job:${job.id}`,
        payload: {
          roleName: row.roleName,
          signerName: row.signerName,
          signerEmail: row.signerEmail,
          shareUrl,
        },
      });
    } catch (error) {
      failedCount += 1;
      await db
        .update(bulkSendRows)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Failed to send",
          updatedAt: new Date(),
        })
        .where(eq(bulkSendRows.id, row.id));
    }
  }

  await db
    .update(bulkSendJobs)
    .set({
      status: failedCount > 0 ? (sentCount > 0 ? "sent" : "failed") : "sent",
      createdCount,
      sentCount,
      failedCount,
      updatedAt: new Date(),
    })
    .where(eq(bulkSendJobs.id, job.id));

  return { createdCount, sentCount, failedCount };
}
