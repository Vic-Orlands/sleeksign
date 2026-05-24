import { NextRequest, NextResponse } from "next/server";

import { buildRecipientRows, parseCsvText } from "@/lib/bulk-send";
import { AccessError, requireDocumentAccess } from "@/lib/server-access";

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const documentId = String(formData.get("documentId") || "");
    const nameColumn = String(formData.get("nameColumn") || "name");
    const emailColumn = String(formData.get("emailColumn") || "email");
    const roleColumn = String(formData.get("roleColumn") || "");
    const defaultRoleName = String(formData.get("defaultRoleName") || "");

    if (!documentId || !isFile(file)) {
      return NextResponse.json(
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

    return NextResponse.json({
      headers,
      rowCount: rows.length,
      preview,
      csvText,
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to parse CSV" }, { status: 500 });
  }
}
