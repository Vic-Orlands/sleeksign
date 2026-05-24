import { and, desc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { bulkSendJobs, bulkSendRows } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { buildRecipientRows, createBulkSendJob, parseCsvText, sendBulkSendJob } from "@/lib/bulk-send";
import { parseRoleConfigs, type WorkflowMode } from "@/lib/field-utils";
import { AccessError, requireDocumentAccess } from "@/lib/server-access";

export async function GET(req: NextRequest) {
  try {
    const documentId = new URL(req.url).searchParams.get("documentId") || "";
    const access = await requireDocumentAccess(req.headers, documentId, "read");

    const jobs = await db.query.bulkSendJobs.findMany({
      where: and(
        eq(bulkSendJobs.documentId, documentId),
        eq(bulkSendJobs.organizationId, access.workspaceId),
      ),
      orderBy: [desc(bulkSendJobs.createdAt)],
    });

    const rows = jobs.length
      ? await db
          .select()
          .from(bulkSendRows)
          .where(
            inArray(
              bulkSendRows.jobId,
              jobs.map((job) => job.id),
            ),
          )
      : [];

    return NextResponse.json(
      jobs.map((job) => ({
        ...job,
        rows: rows.filter((row) => row.jobId === job.id),
        mapping: JSON.parse(job.mapping || "{}"),
      })),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      documentId,
      mode,
      csvText,
      csvFileName,
      mapping,
      sendImmediately,
    } = (await req.json()) as {
      documentId?: string;
      mode?: WorkflowMode;
      csvText?: string;
      csvFileName?: string;
      mapping?: {
        nameColumn: string;
        emailColumn: string;
        roleColumn?: string;
        defaultRoleName?: string;
      };
      sendImmediately?: boolean;
    };

    if (!documentId || !mode || !csvText || !mapping) {
      return NextResponse.json(
        { error: "documentId, mode, csvText, and mapping are required" },
        { status: 400 },
      );
    }

    const access = await requireDocumentAccess(req.headers, documentId, "manage");
    const { rows } = parseCsvText(csvText);
    const recipients = buildRecipientRows(rows, mapping);
    const { jobId, packetId } = await createBulkSendJob({
      organizationId: access.workspaceId,
      teamId: access.document.teamId,
      documentId,
      mode,
      roleConfigs: parseRoleConfigs(access.document.roleConfigs),
      createdByMemberId: access.membership.id,
      csvFileName: csvFileName || "recipients.csv",
      mapping,
      recipients: recipients.recipients,
      errors: recipients.errors,
      sendImmediately: Boolean(sendImmediately),
      requireOtp: access.document.requireOtp,
    });

    if (sendImmediately) {
      await sendBulkSendJob(jobId);
    }

    await emitAuditEvent({
      organizationId: access.workspaceId,
      teamId: access.document.teamId,
      workspaceId: access.workspaceId,
      documentId,
      packetId,
      bulkSendJobId: jobId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: sendImmediately ? "bulk-send.created-and-sent" : "bulk-send.draft-created",
      chainKey: `bulk-job:${jobId}`,
      payload: {
        mode,
        totalRows: recipients.recipients.length,
        errors: recipients.errors.length,
      },
      ...getRequestAuditContext(req.headers),
    });

    return NextResponse.json({ jobId, packetId });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to create bulk send job" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { jobId, documentId } = (await req.json()) as {
      jobId?: string;
      documentId?: string;
    };

    if (!jobId || !documentId) {
      return NextResponse.json({ error: "jobId and documentId are required" }, { status: 400 });
    }

    await requireDocumentAccess(req.headers, documentId, "manage");
    const result = await sendBulkSendJob(jobId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to send bulk job" }, { status: 500 });
  }
}
