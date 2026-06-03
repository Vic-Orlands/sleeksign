import { NextRequest, NextResponse } from "next/server";

import { createReadUrl } from "@/lib/r2-storage";
import { requireSigningSessionAccess, AccessError } from "@/lib/server-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { signingSession } = await requireSigningSessionAccess(
      req.headers,
      id,
      "read",
    );

    if (signingSession.status !== "completed") {
      return NextResponse.json(
        { error: "Document not found or not completed" },
        { status: 404 },
      );
    }

    if (!signingSession.finalizedStorageKey) {
      return NextResponse.json(
        { error: "Document not found or not completed" },
        { status: 404 },
      );
    }

    const url = await createReadUrl(signingSession.finalizedStorageKey, {
      downloadName: `finalized_${signingSession.id}.pdf`,
    });
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
