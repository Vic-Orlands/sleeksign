import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { createReadUrl } from "@/lib/r2-storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sessionId = new URL(req.url).searchParams.get("sessionId") || "";

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        document: true,
      },
    });

    if (
      !session?.document ||
      session.documentId !== id ||
      session.document.uploadStatus !== "ready" ||
      !session.document.storageKey
    ) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const url = await createReadUrl(session.document.storageKey, {
      inlineName: session.document.name,
    });

    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
