import { NextResponse } from "next/server";

import { getPacket } from "@/lib/signing-workflows";
import { getOrganizationBranding } from "@/lib/branding";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const packet = await getPacket(id);
    const branding = await getOrganizationBranding(packet.workspaceId);

    return NextResponse.json(
      {
        id: packet.id,
        mode: packet.mode,
        status: packet.status,
        requireOtp: packet.requireOtp,
        roleConfigs: packet.roleConfigs,
        branding,
        document: {
          id: packet.document.id,
          name: packet.document.name,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Public packet fetch error:", error);
    return NextResponse.json(
      { error: "Packet not found" },
      { status: 404 },
    );
  }
}
