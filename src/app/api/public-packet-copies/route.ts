import { NextRequest, NextResponse } from "next/server";

import { createPacketCopy, getPacket } from "@/lib/signing-workflows";
import { getStorageScopeForRole } from "@/lib/signing-workflows";

export async function POST(req: NextRequest) {
  try {
    const {
      packetId,
      roleName,
      signerName,
      signerEmail,
    }: {
      packetId?: string;
      roleName?: string;
      signerName?: string;
      signerEmail?: string;
    } = await req.json();

    if (!packetId || !roleName) {
      return NextResponse.json(
        { error: "Packet ID and role name are required" },
        { status: 400 },
      );
    }

    const packet = await getPacket(packetId);
    const scope = getStorageScopeForRole(packet.roleConfigs, roleName, packet.mode);

    if (scope === "shared") {
      return NextResponse.json({ copyId: null, shared: true });
    }

    const copyId = await createPacketCopy({
      packetId,
      roleName,
      signerName,
      signerEmail,
    });

    return NextResponse.json({ copyId, shared: false });
  } catch (error) {
    console.error("Public packet copy create error:", error);
    return NextResponse.json(
      { error: "Failed to create signer copy" },
      { status: 500 },
    );
  }
}
