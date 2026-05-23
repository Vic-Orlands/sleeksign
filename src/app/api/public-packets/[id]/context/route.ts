import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { signingPacketCopies, signingPacketValues } from "@/db/schema";
import {
  areRoleFieldsComplete,
  completePacket,
  completePacketCopy,
  getMergedValuesForSigner,
  getPacket,
  getStorageScopeForRole,
  getVisibleFieldsForSigner,
  upsertPacketValue,
} from "@/lib/signing-workflows";
import { finalizeSigningPacket, finalizeSigningPacketCopy } from "@/lib/pdf-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const roleName = new URL(req.url).searchParams.get("role") || "";
    const copyId = new URL(req.url).searchParams.get("copyId") || "";

    const packet = await getPacket(id);
    const visibleFields = getVisibleFieldsForSigner({
      fields: packet.document.fields,
      roleConfigs: packet.roleConfigs,
      mode: packet.mode,
      currentRole: roleName,
    });

    const copyValues = copyId
      ? await db.query.signingPacketValues.findMany({
          where: eq(signingPacketValues.copyId, copyId),
        })
      : [];

    const values = getMergedValuesForSigner({
      packetValues: packet.values,
      copyValues,
      fields: visibleFields,
      roleConfigs: packet.roleConfigs,
      mode: packet.mode,
    });

    const copy = copyId
      ? await db.query.signingPacketCopies.findFirst({
          where: eq(signingPacketCopies.id, copyId),
        })
      : null;

    return NextResponse.json(
      {
        packetId: packet.id,
        mode: packet.mode,
        status: packet.status,
        roleName,
        copyId: copyId || null,
        signerName: copy?.signerName || null,
        signerEmail: copy?.signerEmail || null,
        document: packet.document,
        fields: visibleFields,
        values,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Public packet context error:", error);
    return NextResponse.json(
      { error: "Failed to load signing context" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const {
      fieldId,
      roleName,
      copyId,
      value,
      signerName,
      signerEmail,
    }: {
      fieldId?: string;
      roleName?: string;
      copyId?: string | null;
      value?: string;
      signerName?: string;
      signerEmail?: string;
    } = await req.json();

    if (!fieldId || !roleName || typeof value !== "string") {
      return NextResponse.json(
        { error: "fieldId, roleName, and value are required" },
        { status: 400 },
      );
    }

    const packet = await getPacket(id);
    const scope = getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode);

    await upsertPacketValue({
      packetId: packet.id,
      copyId: scope === "shared" ? null : copyId || null,
      fieldId,
      roleName,
      value,
      signerName,
      signerEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Public packet save error:", error);
    return NextResponse.json(
      { error: "Failed to save field" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const {
      roleName,
      copyId,
      signerName,
      signerEmail,
    }: {
      roleName?: string;
      copyId?: string | null;
      signerName?: string;
      signerEmail?: string;
    } = await req.json();

    if (!roleName) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 },
      );
    }

    const packet = await getPacket(id);
    const visibleFields = getVisibleFieldsForSigner({
      fields: packet.document.fields,
      roleConfigs: packet.roleConfigs,
      mode: packet.mode,
      currentRole: roleName,
    });
    const scope = getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode);
    const currentValues = getMergedValuesForSigner({
      packetValues: packet.values,
      copyValues:
        copyId && scope === "private"
          ? await db.query.signingPacketValues.findMany({
              where: eq(signingPacketValues.copyId, copyId),
            })
          : [],
      fields: visibleFields,
      roleConfigs: packet.roleConfigs,
      mode: packet.mode,
    });

    if (!areRoleFieldsComplete(visibleFields, roleName, currentValues)) {
      return NextResponse.json(
        { error: "Complete all required fields assigned to this role first" },
        { status: 400 },
      );
    }

    if (scope === "shared") {
      const packetUrl = await finalizeSigningPacket({
        packetId: packet.id,
        roleName,
        signerName: signerName || null,
        signerEmail: signerEmail || null,
      });

      if (packetUrl) {
        await completePacket(packet.id, packetUrl);
        return NextResponse.json({ status: "completed", url: packetUrl });
      }

      return NextResponse.json({
        status: "waiting",
        message: "Your part is complete. Waiting for the remaining parties.",
      });
    }

    if (!copyId) {
      return NextResponse.json(
        { error: "Copy ID required for recipient-specific signing" },
        { status: 400 },
      );
    }

    const finalizedUrl = await finalizeSigningPacketCopy({
      packetId: packet.id,
      copyId,
      roleName,
      signerName: signerName || null,
      signerEmail: signerEmail || null,
    });

    await completePacketCopy(copyId, finalizedUrl);

    return NextResponse.json({ status: "completed", url: finalizedUrl });
  } catch (error) {
    console.error("Public packet completion error:", error);
    return NextResponse.json(
      { error: "Failed to complete signing" },
      { status: 500 },
    );
  }
}
