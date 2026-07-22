import type { RequestHandler } from "./$types";
import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { documents, signingPackets } from "@/db/schema";
import { parseSignerRoles } from "@/lib/field-utils";

export const GET: RequestHandler = async ({ request: _req, params }) => {
  const { id } = params;

  const document = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    columns: {
      id: true,
      name: true,
      signerRoles: true,
    },
  });

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const packet = await db.query.signingPackets.findFirst({
    where: and(
      eq(signingPackets.documentId, document.id),
      eq(signingPackets.status, "active"),
      isNull(signingPackets.deletedAt),
    ),
    orderBy: [desc(signingPackets.createdAt)],
    columns: { id: true, requireOtp: true },
  });

  if (!packet) {
    return Response.json({ error: "Signing link is no longer active" }, { status: 404 });
  }

  return Response.json(
    {
      ...document,
      packetId: packet.id,
      requireOtp: packet.requireOtp,
      signerRoles: parseSignerRoles(document.signerRoles),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
