import type { RequestHandler } from "./$types";

import { verifyCustomDomain } from "@/lib/branding";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const { workspaceId, domainId, verificationToken } = (await req.json()) as {
      workspaceId?: string;
      domainId?: string;
      verificationToken?: string;
    };

    if (!workspaceId || !domainId || !verificationToken) {
      return Response.json(
        { error: "workspaceId, domainId, and verificationToken are required" },
        { status: 400 },
      );
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "branding:manage");
    const verified = await verifyCustomDomain(workspaceId, domainId, verificationToken);

    if (!verified) {
      return Response.json({ error: "Unable to verify domain" }, { status: 400 });
    }

    await emitAuditEvent({
      organizationId: workspaceId,
      workspaceId,
      actorType: "user",
      actorId: access.membership.userId,
      eventType: "domain.verified",
      chainKey: `workspace:${workspaceId}`,
      payload: { domainId },
      ...getRequestAuditContext(req.headers),
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    return Response.json({ error: "Failed to verify domain" }, { status: 500 });
  }
}
