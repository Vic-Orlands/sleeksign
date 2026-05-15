import { NextRequest, NextResponse } from 'next/server';
import { finalizeDocument } from '@/lib/pdf-engine';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    const finalUrl = await finalizeDocument(sessionId);
    return NextResponse.json({ url: finalUrl });
  } catch (error) {
    console.error('Finalization error:', error);
    return NextResponse.json({ error: 'Failed to finalize document' }, { status: 500 });
  }
}
