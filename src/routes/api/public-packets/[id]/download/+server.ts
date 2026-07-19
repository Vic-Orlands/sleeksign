import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { signingPacketCopies } from "@/db/schema";
import { findArtifactVerification } from "@/lib/document-verification";
import { createReadUrl } from "@/lib/r2-storage";
import { isOtpVerified } from "@/lib/signer-otp";
import { resolvePacketSignerIdentity } from "@/lib/signer-identity";
import {
  getPacket,
  getStorageScopeForRole,
} from "@/lib/signing-workflows";

export const GET: RequestHandler = async ({ request, params }) => {
  try {
    const url = new URL(request.url);
    const roleName = url.searchParams.get("role") || "";
    const copyId = url.searchParams.get("copyId") || "";
    const download = url.searchParams.get("download") === "1";
    const packet = await getPacket(params.id);

    if (!roleName) {
      return Response.json({ error: "Role required" }, { status: 400 });
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

    const identity = await resolvePacketSignerIdentity({
      packetId: packet.id,
      copyId: copyId || null,
      roleName,
      requestHeaders: request.headers,
    });
    if (!identity) {
      return Response.json(
        { error: "Full name and email address are required" },
        { status: 428 },
      );
    }

    const scope = getStorageScopeForRole(
      packet.roleConfigs,
      roleName,
      packet.mode,
    );
    let artifactType: "packet" | "copy";
    let artifactId: string;

    if (scope === "private") {
      if (!copyId) {
        return Response.json({ error: "Copy ID required" }, { status: 400 });
      }
      const copy = await db.query.signingPacketCopies.findFirst({
        where: eq(signingPacketCopies.id, copyId),
      });
      if (
        !copy ||
        copy.packetId !== packet.id ||
        copy.roleName !== roleName ||
        copy.status !== "completed"
      ) {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }
      artifactType = "copy";
      artifactId = copy.id;
    } else {
      if (packet.status !== "completed") {
        return Response.json({ error: "Document not found" }, { status: 404 });
      }
      artifactType = "packet";
      artifactId = packet.id;
    }

    const receipt = await findArtifactVerification(artifactType, artifactId);
    if (!receipt || receipt.status !== "active") {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const fileName = packet.document.name.replace(/["\\]/g, "");
    const readUrl = await createReadUrl(receipt.finalizedStorageKey, {
      ...(download
        ? { downloadName: `${fileName}.pdf` }
        : { inlineName: `${fileName}.pdf` }),
    });
    return Response.redirect(readUrl);
  } catch {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
};
