import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { signingPacketCopies, signingPackets } from "@/db/schema";
import { createReadUrl } from "@/lib/r2-storage";
import {
  AccessError,
  requireDocumentAccess,
  requireSigningSessionAccess,
} from "@/lib/server-access";

export const GET: RequestHandler = async ({ request: req, params }) => {
  try {
    const { kind, id } = params;
    const download = new URL(req.url).searchParams.get("download") === "1";

    if (kind === "session") {
      const { signingSession } = await requireSigningSessionAccess(
        req.headers,
        id,
        "read",
      );

      if (signingSession.status !== "completed" || !signingSession.finalizedStorageKey) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      const url = await createReadUrl(signingSession.finalizedStorageKey, {
        ...(download
          ? { downloadName: `finalized_${signingSession.id}.pdf` }
          : { inlineName: `finalized_${signingSession.id}.pdf` }),
      });
      return Response.redirect(url);
    }

    if (kind === "packet") {
      const packet = await db.query.signingPackets.findFirst({
        where: eq(signingPackets.id, id),
      });

      if (!packet) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      await requireDocumentAccess(req.headers, packet.documentId, "read");

      if (packet.status !== "completed" || !packet.finalizedStorageKey) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      const url = await createReadUrl(packet.finalizedStorageKey, {
        ...(download
          ? { downloadName: `packet_${packet.id}.pdf` }
          : { inlineName: `packet_${packet.id}.pdf` }),
      });
      return Response.redirect(url);
    }

    if (kind === "copy") {
      const copy = await db.query.signingPacketCopies.findFirst({
        where: eq(signingPacketCopies.id, id),
        with: {
          packet: true,
        },
      });

      if (!copy?.packet) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      await requireDocumentAccess(req.headers, copy.packet.documentId, "read");

      if (copy.status !== "completed" || !copy.finalizedStorageKey) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      const url = await createReadUrl(copy.finalizedStorageKey, {
        ...(download
          ? { downloadName: `copy_${copy.id}.pdf` }
          : { inlineName: `copy_${copy.id}.pdf` }),
      });
      return Response.redirect(url);
    }

    return Response.json({ error: "Document not found" }, { status: 404 });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json({ error: "Document not found" }, { status: 404 });
  }
}
