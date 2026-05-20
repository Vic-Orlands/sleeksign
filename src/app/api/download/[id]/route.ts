import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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

    const fileName = `finalized_${signingSession.id}.pdf`;
    const filePath = path.join(process.cwd(), "public", "uploads", fileName);

    const fileBuffer = await fs.readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
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
