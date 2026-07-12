import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { getObjectBytes } from "@/lib/r2-storage";
import { hasAppPermission } from "@/lib/enterprise-access";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export const GET: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
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

    const bytes = await getObjectBytes(document.storageKey);
    const safeName = document.name.replace(/"/g, "");

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=120",
        "Content-Length": String(bytes.byteLength),
      },
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
