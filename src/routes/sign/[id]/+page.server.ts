import { error, redirect } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

import { db } from "@/db";
import { signingPacketCopies } from "@/db/schema";

export const load: PageServerLoad = async ({ params }) => {
  const copy = await db.query.signingPacketCopies.findFirst({
    where: and(
      eq(signingPacketCopies.id, params.id),
      isNull(signingPacketCopies.deletedAt),
    ),
    with: { packet: true },
  });

  if (!copy?.packet || copy.packet.deletedAt) {
    error(404, "Signing link not found");
  }

  const query = new URLSearchParams({
    role: copy.roleName,
    copyId: copy.id,
  });
  redirect(308, `/sign/packet/${copy.packetId}?${query.toString()}`);
};
