import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";
import { deriveSignerRoles, parseRoleConfigs } from "@/lib/field-utils";
import { serializeDocumentActivity } from "@/lib/dashboard-activity";
import { hasAppPermission } from "@/lib/enterprise-access";

export async function GET(req: Request) {
  try {
    const requestedWorkspaceId = new URL(req.url).searchParams.get(
      "workspaceId",
    );
    const includeArchived =
      new URL(req.url).searchParams.get("includeArchived") === "true";
    const includeDeleted =
      new URL(req.url).searchParams.get("includeDeleted") === "true";
    const access = await requireWorkspaceAccess(
      req.headers,
      requestedWorkspaceId,
      "read",
    );
    const { workspaceId } = access;

    const docs = await db.query.documents.findMany({
      where: and(
        eq(documents.workspaceId, workspaceId),
        hasAppPermission(access, "documents:view_all")
          ? undefined
          : access.teamIds.length > 0
            ? or(inArray(documents.teamId, access.teamIds), isNull(documents.teamId))
            : isNull(documents.teamId),
        includeArchived ? undefined : isNull(documents.archivedAt),
        includeDeleted ? undefined : isNull(documents.deletedAt),
      ),
      orderBy: [desc(documents.createdAt)],
      with: {
        sessions: true,
        fields: true,
        packets: {
          with: {
            copies: true,
            values: true,
          },
        },
      },
    });

    return NextResponse.json(
      docs.map((doc) => {
        const roleConfigs = parseRoleConfigs(doc.roleConfigs);

        return serializeDocumentActivity({
          ...doc,
          signerRoles: deriveSignerRoles(roleConfigs),
          roleConfigs,
          fields: (doc.fields || []).map((field) => ({
            ...field,
            assigneeRole: field.assigneeRole || "",
          })),
        });
      }),
      {
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
