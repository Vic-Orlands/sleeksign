import type { RequestHandler } from "./$types";

import { buildRecipientRows, parseCsvText } from "@/lib/bulk-send";
import { AccessError, requireDocumentAccess } from "@/lib/server-access";

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const documentId = String(formData.get("documentId") || "");
    const nameColumn = String(formData.get("nameColumn") || "name");
    const emailColumn = String(formData.get("emailColumn") || "email");
    const roleColumn = String(formData.get("roleColumn") || "");
    const defaultRoleName = String(formData.get("defaultRoleName") || "");

    if (!documentId || !isFile(file)) {
      return Response.json(
        { error: "documentId and CSV file are required" },
        { status: 400 },
      );
    }

    await requireDocumentAccess(req.headers, documentId, "manage");
    const csvText = await file.text();
    const { headers, rows } = parseCsvText(csvText);
    const preview = buildRecipientRows(rows.slice(0, 10), {
      nameColumn,
      emailColumn,
      roleColumn: roleColumn || undefined,
      defaultRoleName: defaultRoleName || undefined,
    });

    return Response.json({
      headers,
      rowCount: rows.length,
      preview,
      csvText,
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to parse CSV" }, { status: 500 });
  }
}
