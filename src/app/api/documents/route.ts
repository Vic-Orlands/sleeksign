import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export async function GET(req: Request) {
  try {
    const requestedWorkspaceId = new URL(req.url).searchParams.get(
      "workspaceId",
    );
    const { workspaceId } = await requireWorkspaceAccess(
      req.headers,
      requestedWorkspaceId,
      "read",
    );

    const docs = await db.query.documents.findMany({
      where: eq(documents.workspaceId, workspaceId),
      orderBy: [desc(documents.createdAt)],
      with: {
        sessions: true,
        fields: true,
      },
    });

    return NextResponse.json(docs, {
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

    console.error("Documents fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 },
    );
  }
}
