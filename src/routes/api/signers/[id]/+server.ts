import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import {
  AccessError,
  requireSigningSessionAccess,
} from "@/lib/server-access";

export const DELETE: RequestHandler = async ({ request: req, params }) => {
  try {
    const { id } = params;
    await requireSigningSessionAccess(req.headers, id, "manage");

    await db
      .update(sessions)
      .set({ deletedAt: new Date() })
      .where(eq(sessions.id, id));

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return Response.json(
      { error: "Failed to delete signer" },
      { status: 500 },
    );
  }
}
