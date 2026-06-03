import { NextRequest, NextResponse } from "next/server";

import { createReadUrl } from "@/lib/r2-storage";
import { AccessError, requireDocumentAccess } from "@/lib/server-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { document } = await requireDocumentAccess(req.headers, id, "read");

    if (document.uploadStatus !== "ready" || !document.storageKey) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const url = await createReadUrl(document.storageKey, {
      inlineName: document.name,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
