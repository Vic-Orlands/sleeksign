import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { signingPacketCopies } from "@/db/schema";
import { createReadUrl } from "@/lib/r2-storage";
import { isOtpVerified } from "@/lib/signer-otp";
import { getPacket } from "@/lib/signing-workflows";

export const GET: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    const url = new URL(req.url);
    const roleName = url.searchParams.get("role") || "";
    const copyId = url.searchParams.get("copyId") || "";
    const packet = await getPacket(id);

    if (!roleName) {
      return Response.json({ error: "Role required" }, { status: 400 });
    }

    if (copyId) {
      const copy = await db.query.signingPacketCopies.findFirst({
        where: eq(signingPacketCopies.id, copyId),
      });

      if (!copy || copy.packetId !== packet.id) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }
    }

    if (
      packet.requireOtp &&
      !(await isOtpVerified({
        packetId: packet.id,
        copyId: copyId || null,
        roleName,
      }))
    ) {
      return Response.json({ error: "Verification required" }, { status: 403 });
    }

    if (packet.document.uploadStatus !== "ready" || !packet.document.storageKey) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const readUrl = await createReadUrl(packet.document.storageKey, {
      inlineName: packet.document.name,
    });

    return Response.redirect(readUrl);
  } catch {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
}
