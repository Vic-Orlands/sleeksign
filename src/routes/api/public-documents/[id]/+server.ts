import type { RequestHandler } from "./$types";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";
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

  return Response.json(
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
