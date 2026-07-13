import type { RequestHandler } from "./$types";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { documents } from "@/db/schema";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";
import { deriveSignerRoles, parseRoleConfigs } from "@/lib/field-utils";
import { serializeDocumentActivity } from "@/lib/dashboard-activity";
import { hasAppPermission } from "@/lib/enterprise-access";

export const GET: RequestHandler = async ({ request: req }) => {
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

    return Response.json(
      docs.map((doc) => {
        let roleConfigs;
        try {
          roleConfigs = parseRoleConfigs(doc.roleConfigs);
        } catch (error) {
          throw new Error(
            `Document ${doc.id} has invalid role configs: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }

        return serializeDocumentActivity({
          ...doc,
          signerRoles: deriveSignerRoles(roleConfigs),
          roleConfigs,
          fields: (doc.fields || []).map((field) => ({
            ...field,
            assigneeRole: field.assigneeRole === "HR" ? "Owner" : field.assigneeRole || "",
          })),
        });
      }),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to load documents";
    const aborted =
      message.toLowerCase().includes("aborted") ||
      (error instanceof Error && error.name === "AbortError");

    return Response.json(
      {
        error: aborted
          ? "Temporary database interruption. Please retry."
          : message,
      },
      { status: aborted ? 503 : 500 },
    );
  }
}
