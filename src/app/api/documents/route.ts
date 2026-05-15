import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  const docs = await db.query.documents.findMany({
    orderBy: [desc(documents.createdAt)],
    with: {
      sessions: true,
      fields: true,
    }
  });

  return NextResponse.json(docs);
}
