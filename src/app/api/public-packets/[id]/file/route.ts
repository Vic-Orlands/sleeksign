import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { signingPacketCopies } from "@/db/schema";
import { createReadUrl } from "@/lib/r2-storage";
import { isOtpVerified } from "@/lib/signer-otp";
import { getPacket } from "@/lib/signing-workflows";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const roleName = url.searchParams.get("role") || "";
    const copyId = url.searchParams.get("copyId") || "";
    const packet = await getPacket(id);

    if (!roleName) {
      return NextResponse.json({ error: "Role required" }, { status: 400 });
    }

    if (copyId) {
      const copy = await db.query.signingPacketCopies.findFirst({
        where: eq(signingPacketCopies.id, copyId),
      });

      if (!copy || copy.packetId !== packet.id) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
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
      return NextResponse.json({ error: "Verification required" }, { status: 403 });
    }

    if (packet.document.uploadStatus !== "ready" || !packet.document.storageKey) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const readUrl = await createReadUrl(packet.document.storageKey, {
      inlineName: packet.document.name,
    });

    return NextResponse.redirect(readUrl);
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
