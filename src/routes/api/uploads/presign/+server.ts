import type { RequestHandler } from "./$types";
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
  const sanitizedName = name.replace(/[\\/]/g, "_").replace(/\s+/g, " ").trim();
  if (!sanitizedName) throw new Error("File name is required");
  return sanitizedName;
}

function isPdfRequest(fileName: string, contentType: string) {
  return contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
}

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const body = (await req.json()) as {
      fileName?: string;
      fileSize?: number;
      contentType?: string;
      workspaceId?: string;
      documentId?: string;
    };
    if (typeof body.fileName !== "string") {
      return Response.json({ error: "File name is required" }, { status: 400 });
    }
    if (typeof body.contentType !== "string") {
      return Response.json({ error: "Content type is required" }, { status: 400 });
    }
    if (typeof body.fileSize !== "number") {
      return Response.json({ error: "File size is required" }, { status: 400 });
    }

    const originalName = sanitizeFileName(body.fileName);
    const contentType = body.contentType;
    const fileSize = body.fileSize;

    if (!isPdfRequest(originalName, contentType)) {
      return Response.json({ error: "Upload a PDF document" }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (fileSize > MAX_UPLOAD_BYTES) {
      return Response.json(
        { error: "Upload a PDF smaller than 25MB" },
        { status: 413 },
      );
    }

    const {
      workspaceId,
      defaultTeamId,
      membership,
    } = await requireWorkspaceAccess(req.headers, body.workspaceId, "manage", {
      ensureEnterpriseSetup: true,
    });
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

    return Response.json({
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
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Upload presign error:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
