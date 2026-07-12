import type { RequestHandler } from "./$types";

import { createOrUpdateCustomDomain } from "@/lib/branding";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const { workspaceId, hostname } = (await req.json()) as {
      workspaceId?: string;
      hostname?: string;
    };

    if (!workspaceId || !hostname?.trim()) {
      return Response.json({ error: "workspaceId and hostname are required" }, { status: 400 });
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "branding:manage");
    const result = await createOrUpdateCustomDomain(workspaceId, hostname);
    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "domain.requested",
      chainKey: `workspace:${workspaceId}`,
      payload: { hostname: result.hostname },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to save domain" }, { status: 500 });
  }
}
