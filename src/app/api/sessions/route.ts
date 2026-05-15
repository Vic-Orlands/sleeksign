import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, signatures, fields } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { finalizeDocument } from '@/lib/pdf-engine';

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();
    const sessionId = nanoid();

    await db.insert(sessions).values({
      id: sessionId,
      documentId,
    });

    return NextResponse.json({ sessionId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      document: {
        with: {
          fields: true,
        }
      },
      signatures: true,
    }
  });

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  return NextResponse.json(session);
}

// Update session with a signature
export async function PATCH(req: NextRequest) {
  try {
    const { sessionId, fieldId, value } = await req.json();

    const signatureId = nanoid();
    await db.insert(signatures).values({
      id: signatureId,
      sessionId,
      fieldId,
      value,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 });
  }
}
