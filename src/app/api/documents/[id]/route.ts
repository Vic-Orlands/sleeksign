import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents, fields, sessions, signatures } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: {
      fields: true,
      sessions: true,
    },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { type, page, x, y, width, height } = await req.json();
    const fieldId = nanoid();

    await db.insert(fields).values({
      id: fieldId,
      documentId: id,
      type,
      page,
      x,
      y,
      width,
      height,
    });

    return NextResponse.json({ id: fieldId });
  } catch {
    return NextResponse.json({ error: "Failed to add field" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { fieldId, x, y, width, height } = await req.json();
    await db
      .update(fields)
      .set({ x, y, width, height })
      .where(eq(fields.id, fieldId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update field" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.fieldId) {
      await db.delete(fields).where(eq(fields.id, body.fieldId));
      return NextResponse.json({ success: true });
    }

    const docSessions = await db.query.sessions.findMany({
      where: eq(sessions.documentId, id),
    });

    for (const session of docSessions) {
      await db.delete(signatures).where(eq(signatures.sessionId, session.id));
    }

    await db.delete(sessions).where(eq(sessions.documentId, id));
    await db.delete(fields).where(eq(fields.documentId, id));
    await db.delete(documents).where(eq(documents.id, id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name } = await req.json();

  await db.update(documents).set({ name }).where(eq(documents.id, id));
  return NextResponse.json({ success: true });
}
