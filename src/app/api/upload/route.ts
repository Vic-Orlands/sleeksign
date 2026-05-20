import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const workspaceId = String(formData.get("workspaceId") || "");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const { workspaceId: authorizedWorkspaceId } = await requireWorkspaceAccess(
      req.headers,
      workspaceId || undefined,
      "manage",
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${nanoid()}_${file.name}`;
    const uploadDir = path.join(process.cwd(), "public/uploads");

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buffer);

    const docId = nanoid();
    await db.insert(documents).values({
      id: docId,
      name: file.name,
      fileUrl: `/uploads/${fileName}`,
      workspaceId: authorizedWorkspaceId,
    });

    return NextResponse.json({ id: docId, name: file.name, url: `/uploads/${fileName}` });
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
