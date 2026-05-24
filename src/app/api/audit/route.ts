import { and, desc, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { hasAppPermission } from "@/lib/enterprise-access";
import { parseAuditPayload } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId") || "";
    const documentId = url.searchParams.get("documentId");
    const packetId = url.searchParams.get("packetId");
    const eventType = url.searchParams.get("eventType");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "audit:view");

    const logs = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.organizationId, access.workspaceId),
        documentId ? eq(auditLogs.documentId, documentId) : undefined,
        packetId ? eq(auditLogs.packetId, packetId) : undefined,
        eventType ? eq(auditLogs.eventType, eventType) : undefined,
        dateFrom ? gte(auditLogs.createdAt, new Date(dateFrom)) : undefined,
        dateTo ? lte(auditLogs.createdAt, new Date(dateTo)) : undefined,
      ),
      orderBy: [desc(auditLogs.createdAt)],
    });

    const filteredLogs = logs.filter((log) =>
      hasAppPermission(access, "audit:view_all")
        ? true
        : !log.teamId || access.teamIds.includes(log.teamId),
    );

    return NextResponse.json(
      filteredLogs.map((log) => ({
        ...log,
        payload: parseAuditPayload(log.payload),
      })),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
