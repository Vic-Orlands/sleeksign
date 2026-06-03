import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, signatures } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { parseSignerRoles } from "@/lib/field-utils";

export async function POST(req: NextRequest) {
  try {
    const { documentId, signerName, signerEmail, signerRole } = await req.json();
    const sessionId = nanoid();

    await db.insert(sessions).values({
      id: sessionId,
      documentId,
      signerName: signerName || null,
      signerEmail: signerEmail || null,
      signerRole: signerRole || null,
    });

    return NextResponse.json({ sessionId });
  } catch {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId)
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      document: {
        with: {
          fields: true,
        },
      },
      signatures: true,
    },
  });

  if (!session)
    return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Update session with metadata if not already completed
  if (session.status !== "completed") {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const ua = req.headers.get("user-agent") || "Unknown";

    await db
      .update(sessions)
      .set({ signerIp: ip, signerUserAgent: ua })
      .where(eq(sessions.id, sessionId));
  }

  return NextResponse.json(
    {
      ...session,
      document: {
        ...session.document,
        fileUrl: `/api/public-documents/${session.document.id}/file?sessionId=${session.id}`,
        signerRoles: parseSignerRoles(session.document.signerRoles),
        fields: session.document.fields.map((field) => ({
          ...field,
          assigneeRole: field.assigneeRole || "",
        })),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PATCH(req: NextRequest) {
  try {
    const { sessionId, fieldId, value } = await req.json();

    // Upsert signature: if exists for this session/field, update it.
    const existing = await db.query.signatures.findFirst({
      where: and(
        eq(signatures.sessionId, sessionId),
        eq(signatures.fieldId, fieldId),
      ),
    });

    if (existing) {
      await db
        .update(signatures)
        .set({ value })
        .where(eq(signatures.id, existing.id));
    } else {
      await db.insert(signatures).values({
        id: nanoid(),
        sessionId,
        fieldId,
        value,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signature patch error:", error);
    return NextResponse.json(
      { error: "Failed to save signature" },
      { status: 500 },
    );
  }
}
