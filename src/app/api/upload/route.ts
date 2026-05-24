import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function isFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/]/g, "_").replace(/\s+/g, " ").trim() || "document.pdf";
}

function isPdf(buffer: Buffer) {
  return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const workspaceId = String(formData.get("workspaceId") || "");

    if (!isFile(file) || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Upload a PDF smaller than 25MB" },
        { status: 413 },
      );
    }

    const {
      workspaceId: authorizedWorkspaceId,
      defaultTeamId,
      membership,
    } = await requireWorkspaceAccess(
      req.headers,
      workspaceId || undefined,
      "manage",
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isPdf(buffer)) {
      return NextResponse.json(
        { error: "Only valid PDF documents can be uploaded" },
        { status: 400 },
      );
    }

    const originalName = sanitizeFileName(file.name);
    const fileName = `${nanoid()}_${originalName}`;
    const uploadDir = path.join(process.cwd(), "public/uploads");

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buffer);

    const docId = nanoid();
    await db.insert(documents).values({
      id: docId,
      name: originalName,
      fileUrl: `/uploads/${fileName}`,
      workspaceId: authorizedWorkspaceId,
      teamId: defaultTeamId,
    });

    await emitAuditEvent({
      organizationId: authorizedWorkspaceId,
      teamId: defaultTeamId,
      workspaceId: authorizedWorkspaceId,
      documentId: docId,
      actorType: "user",
      actorId: membership.userId,
      eventType: "document.created",
      chainKey: `document:${docId}`,
      payload: {
        name: originalName,
        fileUrl: `/uploads/${fileName}`,
      },
      ...getRequestAuditContext(req.headers),
    });

    return NextResponse.json({ id: docId, name: originalName, url: `/uploads/${fileName}` });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
