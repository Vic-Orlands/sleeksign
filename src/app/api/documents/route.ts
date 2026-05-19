import { NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json([], {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const docs = await db.query.documents.findMany({
    where: eq(documents.workspaceId, workspaceId),
    orderBy: [desc(documents.createdAt)],
    with: {
      sessions: true,
      fields: true,
    }
  });

  return NextResponse.json(docs, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
