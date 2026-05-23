import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import {
  AccessError,
  requireSigningSessionAccess,
} from "@/lib/server-access";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireSigningSessionAccess(req.headers, id, "manage");

    await db
      .update(sessions)
      .set({ deletedAt: new Date() })
      .where(eq(sessions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete signer" },
      { status: 500 },
    );
  }
}
