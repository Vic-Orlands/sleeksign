import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { signingPacketCopies } from "@/db/schema";
import { getR2ObjectStream } from "@/lib/r2-storage";
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

    const range = req.headers.get("range") || undefined;
    const object = await getR2ObjectStream(packet.document.storageKey, range);
    const stream = object.body;
    if (!stream) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const safeName = packet.document.name.replace(/"/g, "");
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
    console.error("Public packet file proxy error:", error);
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
};
