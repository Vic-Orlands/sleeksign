import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { parseSignerRoles } from "@/lib/field-utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const document = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    columns: {
      id: true,
      name: true,
      signerRoles: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ...document,
      signerRoles: parseSignerRoles(document.signerRoles),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
