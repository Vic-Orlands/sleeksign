import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workspaceId = String(formData.get("workspaceId") || "");

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${nanoid()}_${file.name}`;
    const uploadDir = path.join(process.cwd(), 'public/uploads');

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, fileName), buffer);

    const docId = nanoid();
    await db.insert(documents).values({
      id: docId,
      name: file.name,
      fileUrl: `/uploads/${fileName}`,
      workspaceId,
    });

    return NextResponse.json({ id: docId, name: file.name, url: `/uploads/${fileName}` });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
