import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import {
  deleteObject,
  headObject,
  isPdfObject,
} from "@/lib/r2-storage";
import { AccessError, requireDocumentAccess } from "@/lib/server-access";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const body = (await req.json()) as { documentId?: string };
    const documentId = String(body.documentId || "");

    if (!documentId) {
      return Response.json({ error: "Document ID required" }, { status: 400 });
    }

    const access = await requireDocumentAccess(req.headers, documentId, "manage");
    const document = access.document;

    if (!document.storageKey) {
      return Response.json({ error: "Document storage not configured" }, { status: 400 });
    }

    const metadata = await headObject(document.storageKey);
    const validPdf = metadata.contentLength > 0 &&
      metadata.contentLength <= MAX_UPLOAD_BYTES &&
      (await isPdfObject(document.storageKey));

    if (!validPdf) {
      await deleteObject(document.storageKey);
      await db
        .update(documents)
        .set({
          uploadStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));

      return Response.json(
        { error: "Only valid PDF documents can be uploaded" },
        { status: 400 },
      );
    }

    const fileUrl = `/api/documents/${documentId}/file`;
    await db
      .update(documents)
      .set({
        fileUrl,
        uploadStatus: "ready",
        fileSize: metadata.contentLength,
        contentType: "application/pdf",
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    await emitAuditEvent({
      organizationId: access.workspaceId,
      teamId: document.teamId,
      workspaceId: access.workspaceId,
      documentId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "document.created",
      chainKey: `document:${documentId}`,
      payload: {
        name: document.name,
        storageProvider: document.storageProvider,
        fileSize: metadata.contentLength,
      },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({
      id: documentId,
      name: document.name,
      url: fileUrl,
      fileUrl,
      createdAt: document.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Upload complete error:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
