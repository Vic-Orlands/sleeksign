import type { RequestHandler } from "./$types";

import { getOrganizationBranding, upsertOrganizationBranding } from "@/lib/branding";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export const GET: RequestHandler = async ({ request: req }) => {
  try {
    const workspaceId = new URL(req.url).searchParams.get("workspaceId") || "";
    const access = await requireWorkspaceAccess(req.headers, workspaceId, "read");
    const branding = await getOrganizationBranding(access.workspaceId);

    return Response.json({ branding });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to load branding" }, { status: 500 });
  }
}

export const PUT: RequestHandler = async ({ request: req }) => {
  try {
    const { workspaceId, ...input } = (await req.json()) as Record<string, unknown>;

    if (typeof workspaceId !== "string" || !workspaceId) {
      return Response.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "branding:manage");
    await upsertOrganizationBranding(workspaceId, input);
    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "branding.updated",
      chainKey: `workspace:${workspaceId}`,
      payload: input,
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to update branding" }, { status: 500 });
  }
}
