import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { hasAppPermission } from "@/lib/enterprise-access";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";
import { getR2ObjectStream } from "@/lib/r2-storage";

export const GET: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      columns: {
        id: true,
        name: true,
        workspaceId: true,
        teamId: true,
        uploadStatus: true,
        storageKey: true,
      },
    });

    if (!document) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const access = await requireWorkspaceAccess(req.headers, document.workspaceId, "read");
    if (
      document.teamId &&
      !hasAppPermission(access, "documents:view_all") &&
      !access.teamIds.includes(document.teamId)
    ) {
      throw new AccessError("Forbidden", 403);
    }

    if (document.uploadStatus !== "ready" || !document.storageKey) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const range = req.headers.get("range") || undefined;
    const object = await getR2ObjectStream(document.storageKey, range);
    const stream = object.body;
    if (!stream) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const safeName = document.name.replace(/"/g, "");
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=300",
      "Accept-Ranges": "bytes",
    });

    if (object.contentLength != null) {
      headers.set("Content-Length", String(object.contentLength));
    }
    if (object.contentRange) {
      headers.set("Content-Range", object.contentRange);
    }

    return new Response(stream, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Document file proxy error:", error);
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
};
