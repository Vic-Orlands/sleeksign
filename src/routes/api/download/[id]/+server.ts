import type { RequestHandler } from "./$types";

import { createReadUrl } from "@/lib/r2-storage";
import { requireSigningSessionAccess, AccessError } from "@/lib/server-access";

export const GET: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const { signingSession } = await requireSigningSessionAccess(
      req.headers,
      id,
      "read",
    );

    if (signingSession.status !== "completed") {
      return Response.json(
        { error: "Document not found or not completed" },
        { status: 404 },
      );
    }

    if (!signingSession.finalizedStorageKey) {
      return Response.json(
        { error: "Document not found or not completed" },
        { status: 404 },
      );
    }

    const url = await createReadUrl(signingSession.finalizedStorageKey, {
      downloadName: `finalized_${signingSession.id}.pdf`,
    });
    return Response.redirect(url);
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json({ error: "File not found" }, { status: 404 });
  }
}
