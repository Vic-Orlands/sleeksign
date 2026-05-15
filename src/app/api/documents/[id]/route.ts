import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents, fields } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: {
      fields: true,
    },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to add field" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { fieldId, x, y, width, height } = await req.json();
    await db
      .update(fields)
      .set({ x, y, width, height })
      .where(eq(fields.id, fieldId));
    return NextResponse.json({ success: true });
  } catch (error) {
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
    const { fieldId } = await req.json();
    await db.delete(fields).where(eq(fields.id, fieldId));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 },
    );
  }
}
