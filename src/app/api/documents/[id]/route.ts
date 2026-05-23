import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents, fields } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { AccessError, requireDocumentAccess } from "@/lib/server-access";
import {
  deriveSignerRoles,
  parseRoleConfigs,
  serializeRoleConfigs,
  serializeSignerRoles,
} from "@/lib/field-utils";
import { serializeDocumentActivity } from "@/lib/dashboard-activity";

function serializeDocumentRecord(doc: Record<string, unknown>) {
  const roleConfigs = parseRoleConfigs(doc.roleConfigs as string | null | undefined);
  const rawFields = Array.isArray(doc.fields)
    ? (doc.fields as Array<Record<string, unknown> & { assigneeRole?: string | null }>)
    : [];

  return serializeDocumentActivity({
    ...doc,
    signerRoles: deriveSignerRoles(roleConfigs),
    roleConfigs,
    fields: rawFields.map((field) => ({
      ...field,
      assigneeRole: field.assigneeRole || "",
    })) as Array<typeof fields.$inferSelect>,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await requireDocumentAccess(req.headers, id, "read");

    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, id),
      with: {
        fields: true,
        sessions: true,
        packets: {
          with: {
            copies: true,
            values: true,
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(serializeDocumentRecord(doc), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Document fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireDocumentAccess(req.headers, id, "manage");
    const { type, page, x, y, width, height, required, assigneeRole } =
      await req.json();
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
      required: required ?? true,
      assigneeRole: typeof assigneeRole === "string" ? assigneeRole : "",
    });

    return NextResponse.json({ id: fieldId });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Failed to add field" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireDocumentAccess(req.headers, id, "manage");
    const body = await req.json().catch(() => ({}));

    if (body.fieldId) {
      await db.delete(fields).where(eq(fields.id, body.fieldId));
      return NextResponse.json({ success: true });
    }

    await db
      .update(documents)
      .set({
        deletedAt: new Date(),
        archivedAt: null,
      })
      .where(eq(documents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

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
  try {
    await requireDocumentAccess(req.headers, id, "manage");
    const { name, signerRoles, roleConfigs } = await req.json();
    const updateData: {
      name?: string;
      signerRoles?: string;
      roleConfigs?: string;
    } = {};

    if (typeof name === "string" && name.trim()) {
      updateData.name = name;
    }

    if (Array.isArray(roleConfigs)) {
      updateData.roleConfigs = serializeRoleConfigs(roleConfigs);
      updateData.signerRoles = serializeSignerRoles(
        deriveSignerRoles(roleConfigs),
      );
    }

    if (Array.isArray(signerRoles)) {
      updateData.signerRoles = serializeSignerRoles(signerRoles);
    }

    await db.update(documents).set(updateData).where(eq(documents.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Failed to rename document" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.fieldId) {
      const {
        fieldId,
        x,
        y,
        width,
        height,
        required,
        assigneeRole,
        documentId,
      } = body;
      if (!documentId) {
        return NextResponse.json(
          { error: "Document ID required" },
          { status: 400 },
        );
      }

      await requireDocumentAccess(req.headers, documentId, "manage");
      await db
        .update(fields)
        .set({
          x,
          y,
          width,
          height,
          required,
          assigneeRole: typeof assigneeRole === "string" ? assigneeRole : "",
        })
        .where(eq(fields.id, fieldId));
      return NextResponse.json({ success: true });
    }

    await requireDocumentAccess(req.headers, id, "manage");

    if (body.action === "archive") {
      await db
        .update(documents)
        .set({ archivedAt: new Date(), deletedAt: null })
        .where(eq(documents.id, id));
      return NextResponse.json({ success: true });
    }

    if (body.action === "restore") {
      await db
        .update(documents)
        .set({ archivedAt: null, deletedAt: null })
        .where(eq(documents.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Unsupported action" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
}
