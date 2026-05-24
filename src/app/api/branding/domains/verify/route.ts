import { NextRequest, NextResponse } from "next/server";

import { verifyCustomDomain } from "@/lib/branding";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, domainId, verificationToken } = (await req.json()) as {
      workspaceId?: string;
      domainId?: string;
      verificationToken?: string;
    };

    if (!workspaceId || !domainId || !verificationToken) {
      return NextResponse.json(
        { error: "workspaceId, domainId, and verificationToken are required" },
        { status: 400 },
      );
    }

    const access = await requireWorkspaceAccess(req.headers, workspaceId, "branding:manage");
    const verified = await verifyCustomDomain(workspaceId, domainId, verificationToken);

    if (!verified) {
      return NextResponse.json({ error: "Unable to verify domain" }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Failed to verify domain" }, { status: 500 });
  }
}
