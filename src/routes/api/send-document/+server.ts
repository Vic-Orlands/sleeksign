import type { RequestHandler } from "./$types";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { signerGroupMembers, signerGroups, workspaceSigners } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { getOrganizationBranding, getWorkspaceBaseUrl } from "@/lib/branding";
import { buildBulkSendInviteEmail } from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send-email";
import { parseRoleConfigs, type WorkflowMode } from "@/lib/field-utils";
import { createPacketCopy, createSigningPacket } from "@/lib/signing-workflows";
import { AccessError, requireDocumentAccess } from "@/lib/server-access";

type SendTarget =
  | {
      kind: "email"
      name: string
      email: string
      roleName: string
    }
  | {
      kind: "signer"
      signerId: string
      roleName: string
    }
  | {
      kind: "group"
      groupId: string
      roleName: string
    }

export const POST: RequestHandler = async ({ request: req }) => {
  try {
    const { documentId, mode, targets } = (await req.json()) as {
      documentId?: string
      mode?: WorkflowMode
      targets?: SendTarget[]
    }

    if (!documentId || !mode || !Array.isArray(targets) || targets.length === 0) {
      return Response.json(
        { error: "Document, workflow mode, and at least one target are required" },
        { status: 400 },
      )
    }

    const access = await requireDocumentAccess(req.headers, documentId, "packets:send")
    const roleConfigs = parseRoleConfigs(access.document.roleConfigs)
    const packetId = await createSigningPacket(documentId, mode, roleConfigs, {
      workspaceId: access.workspaceId,
      teamId: access.document.teamId || access.defaultTeamId,
      requireOtp: access.document.requireOtp,
    })
    const branding = await getOrganizationBranding(access.workspaceId)
    const baseUrl = getWorkspaceBaseUrl(
      branding,
      process.env.BETTER_AUTH_URL ||
        process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
        "http://localhost:5173",
    )

    const signerTargets = targets.filter(
      (target): target is Extract<SendTarget, { kind: "signer" }> => target.kind === "signer",
    )
    const groupTargets = targets.filter(
      (target): target is Extract<SendTarget, { kind: "group" }> => target.kind === "group",
    )

    const signerRows =
      signerTargets.length > 0
        ? await db.query.workspaceSigners.findMany({
            where: and(
              eq(workspaceSigners.organizationId, access.workspaceId),
              inArray(
                workspaceSigners.id,
                signerTargets.map((target) => target.signerId),
              ),
            ),
          })
        : []

    const groupRows =
      groupTargets.length > 0
        ? await db.query.signerGroups.findMany({
            where: and(
              eq(signerGroups.organizationId, access.workspaceId),
              inArray(
                signerGroups.id,
                groupTargets.map((target) => target.groupId),
              ),
            ),
          })
        : []

    const groupMembershipRows =
      groupRows.length > 0
        ? await db.query.signerGroupMembers.findMany({
            where: inArray(
              signerGroupMembers.groupId,
              groupRows.map((group) => group.id),
            ),
          })
        : []

    const groupSignerIds = groupMembershipRows.map((membership) => membership.signerId)
    const groupedSigners =
      groupSignerIds.length > 0
        ? await db.query.workspaceSigners.findMany({
            where: and(
              eq(workspaceSigners.organizationId, access.workspaceId),
              inArray(workspaceSigners.id, groupSignerIds),
            ),
          })
        : []

    const deliveries: Array<{ email: string; name: string; roleName: string; sourceId?: string; sourceType: "email" | "signer" | "group" }> = []

    for (const target of targets) {
      if (target.kind === "email") {
        deliveries.push({
          email: target.email.trim().toLowerCase(),
          name: target.name.trim() || target.roleName,
          roleName: target.roleName,
          sourceType: "email",
        })
        continue
      }

      if (target.kind === "signer") {
        const signer = signerRows.find((entry) => entry.id === target.signerId)
        if (!signer) continue
        deliveries.push({
          email: signer.email,
          name: signer.name,
          roleName: target.roleName,
          sourceId: signer.id,
          sourceType: "signer",
        })
        continue
      }

      const group = groupRows.find((entry) => entry.id === target.groupId)
      if (!group) continue
      const memberSigners = groupMembershipRows
        .filter((membership) => membership.groupId === group.id)
        .map((membership) =>
          groupedSigners.find((signer) => signer.id === membership.signerId),
        )
        .filter(Boolean)

      memberSigners.forEach((signer) => {
        deliveries.push({
          email: signer!.email,
          name: signer!.name,
          roleName: target.roleName,
          sourceId: group.id,
          sourceType: "group",
        })
      })
    }

    for (const delivery of deliveries) {
      const copyId = await createPacketCopy({
        packetId,
        roleName: delivery.roleName,
        signerName: delivery.name,
        signerEmail: delivery.email,
        teamId: access.document.teamId || access.defaultTeamId,
        recipientType: delivery.sourceType,
        recipientSourceId: delivery.sourceId || null,
      })
      const inviteUrl = `${baseUrl}/sign/packet/${packetId}?role=${encodeURIComponent(delivery.roleName)}&copyId=${encodeURIComponent(copyId)}`
      const message = buildBulkSendInviteEmail({
        branding,
        documentName: access.document.name,
        roleName: delivery.roleName,
        signerName: delivery.name,
        inviteUrl,
      })

      await sendTransactionalEmail({
        to: delivery.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
        fromName: branding.senderName,
      })
    }

    await emitAuditEvent({
      organizationId: access.workspaceId,
      workspaceId: access.workspaceId,
      documentId,
      packetId,
      teamId: access.document.teamId || access.defaultTeamId,
      actorType: "user",
      actorId: access.membership.userId,
      actorEmail: access.session.user.email,
      eventType: "document.sent",
      chainKey: `document:${documentId}`,
      payload: {
        packetId,
        mode,
        deliveryCount: deliveries.length,
      },
      ...getRequestAuditContext(req.headers),
    })

    return Response.json({ packetId, deliveryCount: deliveries.length })
  } catch (error) {
    if (error instanceof AccessError) {
      return Response.json({ error: error.message }, { status: error.status })
    }

    return Response.json({ error: "Failed to send document" }, { status: 500 })
  }
}
