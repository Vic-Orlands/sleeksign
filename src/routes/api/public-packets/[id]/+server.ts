import type { RequestHandler } from "./$types";

import { getPacket } from "@/lib/signing-workflows";
import { getOrganizationBranding } from "@/lib/branding";

export const GET: RequestHandler = async ({ request: _req, params }) => {
  try {
    const { id } = params;
    const packet = await getPacket(id);
    const branding = await getOrganizationBranding(packet.workspaceId);

    return Response.json(
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
    return Response.json(
      { error: "Packet not found" },
      { status: 404 },
    );
  }
}
