import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import {
  buildDocumentSourceKey,
  createUploadUrl,
} from "@/lib/r2-storage";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[\\/]/g, "_").replace(/\s+/g, " ").trim() || "document.pdf";
}

function isPdfRequest(fileName: string, contentType: string) {
  return contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      fileName?: string;
      fileSize?: number;
      contentType?: string;
      workspaceId?: string;
      documentId?: string;
    };
    const originalName = sanitizeFileName(String(body.fileName || ""));
    const contentType = String(body.contentType || "application/pdf");
    const fileSize = Number(body.fileSize || 0);

    if (!isPdfRequest(originalName, contentType)) {
      return NextResponse.json({ error: "Upload a PDF document" }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Upload a PDF smaller than 25MB" },
        { status: 413 },
      );
    }

    const {
      workspaceId,
      defaultTeamId,
      membership,
    } = await requireWorkspaceAccess(req.headers, body.workspaceId, "manage");
    const documentId =
      typeof body.documentId === "string" && body.documentId.trim()
        ? body.documentId
        : nanoid();
    const storageKey = buildDocumentSourceKey(workspaceId, documentId);
    const fileUrl = `/api/documents/${documentId}/file`;
    const uploadUrl = await createUploadUrl(storageKey);

    await db.insert(documents).values({
      id: documentId,
      name: originalName,
      fileUrl,
      storageKey,
      storageProvider: "r2",
      uploadStatus: "pending_upload",
      fileSize,
      contentType: "application/pdf",
      workspaceId,
      teamId: defaultTeamId,
    });

    await emitAuditEvent({
      organizationId: workspaceId,
      teamId: defaultTeamId,
      workspaceId,
      documentId,
      actorType: "user",
      actorId: membership.userId,
      eventType: "document.upload_requested",
      chainKey: `document:${documentId}`,
      payload: {
        name: originalName,
        storageProvider: "r2",
        fileSize,
      },
      ...getRequestAuditContext(req.headers),
    });

    return NextResponse.json({
      id: documentId,
      name: originalName,
      fileUrl,
      uploadUrl,
      storageKey,
      contentType: "application/pdf",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Upload presign error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
