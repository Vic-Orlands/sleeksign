import type { RequestHandler } from "./$types";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { signingPacketCopies, signingPackets } from "@/db/schema";
import { createReadUrl } from "@/lib/r2-storage";
import { findArtifactVerification } from "@/lib/document-verification";
import {
  AccessError,
  requireDocumentAccess,
  requirePacketCopyAccess,
} from "@/lib/server-access";

export const GET: RequestHandler = async ({ request: req, params }) => {
  try {
    const { kind, id } = params;
    const download = new URL(req.url).searchParams.get("download") === "1";

    if (kind === "session") {
      const { packetCopy } = await requirePacketCopyAccess(
        req.headers,
        id,
        "read",
      );

      const receipt = await findArtifactVerification("session", id);
      if (packetCopy.status !== "completed" || receipt?.status !== "active") {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      const url = await createReadUrl(receipt.finalizedStorageKey, {
        ...(download
          ? { downloadName: `finalized_${packetCopy.id}.pdf` }
          : { inlineName: `finalized_${packetCopy.id}.pdf` }),
      });
      return Response.redirect(url);
    }

    if (kind === "packet") {
      const packet = await db.query.signingPackets.findFirst({
        where: and(eq(signingPackets.id, id), isNull(signingPackets.deletedAt)),
      });

      if (!packet) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      await requireDocumentAccess(req.headers, packet.documentId, "read");

      const receipt = await findArtifactVerification("packet", id);
      if (packet.status !== "completed" || receipt?.status !== "active") {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      const url = await createReadUrl(receipt.finalizedStorageKey, {
        ...(download
          ? { downloadName: `packet_${packet.id}.pdf` }
          : { inlineName: `packet_${packet.id}.pdf` }),
      });
      return Response.redirect(url);
    }

    if (kind === "copy") {
      const copy = await db.query.signingPacketCopies.findFirst({
        where: and(
          eq(signingPacketCopies.id, id),
          isNull(signingPacketCopies.deletedAt),
        ),
        with: {
          packet: true,
        },
      });

      if (!copy?.packet || copy.packet.deletedAt) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      await requireDocumentAccess(req.headers, copy.packet.documentId, "read");

      const receipt =
        (await findArtifactVerification("copy", id)) ||
        (await findArtifactVerification("session", id));
      if (copy.status !== "completed" || receipt?.status !== "active") {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }

      const url = await createReadUrl(receipt.finalizedStorageKey, {
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
