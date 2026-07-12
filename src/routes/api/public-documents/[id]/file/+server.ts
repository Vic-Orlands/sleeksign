import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { createReadUrl } from "@/lib/r2-storage";

export const GET: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const sessionId = new URL(req.url).searchParams.get("sessionId") || "";

    if (!sessionId) {
      return Response.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        document: true,
      },
    });

    if (
      !session?.document ||
      session.documentId !== id ||
      session.document.uploadStatus !== "ready" ||
      !session.document.storageKey
    ) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const url = await createReadUrl(session.document.storageKey, {
      inlineName: session.document.name,
    });

    return Response.redirect(url);
  } catch {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
}
