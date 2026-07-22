import type { RequestHandler } from "./$types";
import { and, eq, isNull } from "drizzle-orm";
import JSZip from "jszip";

import { db } from "@/db";
import { signingPacketCopies, signingPackets } from "@/db/schema";
import { getObjectBytes } from "@/lib/r2-storage";
import { findArtifactVerification } from "@/lib/document-verification";
import {
  AccessError,
  requireDocumentAccess,
  requirePacketCopyAccess,
} from "@/lib/server-access";

type DownloadItem = {
  kind: "session" | "packet" | "copy";
  id: string;
  name?: string;
};

function safeName(value: string, index: number) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const base = cleaned || `signed-document-${index + 1}`;
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { items } = (await request.json()) as { items?: DownloadItem[] };
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return Response.json(
        { error: "Select between 1 and 50 signed documents" },
        { status: 400 },
      );
    }

    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (const [index, item] of items.entries()) {
      let storageKey: string | null = null;

      if (item.kind === "session") {
        const { packetCopy } = await requirePacketCopyAccess(
          request.headers,
          item.id,
          "read",
        );
        if (packetCopy.status === "completed") {
          const receipt = await findArtifactVerification("session", item.id);
          if (receipt?.status === "active") storageKey = receipt.finalizedStorageKey;
        }
      } else if (item.kind === "packet") {
        const packet = await db.query.signingPackets.findFirst({
          where: and(eq(signingPackets.id, item.id), isNull(signingPackets.deletedAt)),
        });
        if (packet) {
          await requireDocumentAccess(request.headers, packet.documentId, "read");
          if (packet.status === "completed") {
            const receipt = await findArtifactVerification("packet", item.id);
            if (receipt?.status === "active") storageKey = receipt.finalizedStorageKey;
          }
        }
      } else if (item.kind === "copy") {
        const copy = await db.query.signingPacketCopies.findFirst({
          where: and(
            eq(signingPacketCopies.id, item.id),
            isNull(signingPacketCopies.deletedAt),
          ),
          with: { packet: true },
        });
        if (copy?.packet) {
          await requireDocumentAccess(request.headers, copy.packet.documentId, "read");
          if (copy.status === "completed") {
            const receipt = await findArtifactVerification("copy", item.id);
            if (receipt?.status === "active") storageKey = receipt.finalizedStorageKey;
          }
        }
      }

      if (!storageKey) continue;

      let fileName = safeName(item.name || `signed-document-${index + 1}`, index);
      if (usedNames.has(fileName)) {
        fileName = fileName.replace(/\.pdf$/i, `-${index + 1}.pdf`);
      }
      usedNames.add(fileName);
      zip.file(fileName, await getObjectBytes(storageKey));
    }

    if (usedNames.size === 0) {
      return Response.json({ error: "No downloadable signed documents found" }, { status: 404 });
    }

    const bytes = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
    return new Response(bytes, {
      headers: {
        "Content-Disposition": 'attachment; filename="sleeksign-signed-documents.zip"',
        "Content-Type": "application/zip",
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Batch signed document download failed:", error);
    return Response.json({ error: "Failed to prepare signed documents" }, { status: 500 });
  }
};
