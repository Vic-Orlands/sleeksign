import { eq } from "drizzle-orm";

import { db } from "@/db";
import { customDomains, organizationBranding } from "@/db/schema";
import {
	createOrUpdateCustomDomain,
	upsertOrganizationBranding,
	verifyCustomDomain,
} from "@/lib/branding";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { buildDomainRequestEmail } from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send-email";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export type BrandingPayload = {
	senderName: string;
	primaryColor: string;
	secondaryColor: string;
	neutralColor: string;
	accentColor: string;
	supportEmail: string;
	logoUrl: string;
};

const DEFAULT_BRANDING: BrandingPayload = {
	senderName: "SleekSign",
	primaryColor: "#18181b",
	secondaryColor: "#f97316",
	neutralColor: "#f7f5f1",
	accentColor: "#ea580c",
	supportEmail: "",
	logoUrl: "",
};

export async function getBranding(headers: HeadersInit, workspaceId: string) {
	await requireWorkspaceAccess(headers, workspaceId, "read");
	const row = await db.query.organizationBranding.findFirst({
		where: eq(organizationBranding.organizationId, workspaceId),
	});

	if (!row) return { ...DEFAULT_BRANDING };

	return {
		senderName: row.senderName || DEFAULT_BRANDING.senderName,
		primaryColor: row.primaryColor || DEFAULT_BRANDING.primaryColor,
		secondaryColor: row.secondaryColor || DEFAULT_BRANDING.secondaryColor,
		neutralColor: row.neutralColor || DEFAULT_BRANDING.neutralColor,
		accentColor: row.accentColor || DEFAULT_BRANDING.accentColor,
		supportEmail: row.supportEmail || "",
		logoUrl: row.logoUrl || "",
	} satisfies BrandingPayload;
}

export async function saveBranding(
	headers: HeadersInit,
	workspaceId: string,
	payload: Partial<BrandingPayload>,
) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "branding:manage");
	await upsertOrganizationBranding(workspaceId, {
		senderName: payload.senderName?.trim() || DEFAULT_BRANDING.senderName,
		primaryColor: payload.primaryColor || DEFAULT_BRANDING.primaryColor,
		secondaryColor: payload.secondaryColor || DEFAULT_BRANDING.secondaryColor,
		neutralColor: payload.neutralColor || DEFAULT_BRANDING.neutralColor,
		accentColor: payload.accentColor || DEFAULT_BRANDING.accentColor,
		supportEmail: payload.supportEmail?.trim() || null,
		logoUrl: payload.logoUrl?.trim() || null,
	});

	await emitAuditEvent({
		organizationId: workspaceId,
		workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "branding.updated",
		chainKey: `workspace:${workspaceId}`,
		payload: {},
		...getRequestAuditContext(headers),
	});
}

export async function listDomains(headers: HeadersInit, workspaceId: string) {
	await requireWorkspaceAccess(headers, workspaceId, "branding:manage");
	return db.query.customDomains.findMany({
		where: eq(customDomains.organizationId, workspaceId),
	});
}

export async function requestDomain(
	headers: HeadersInit,
	workspaceId: string,
	hostname: string,
) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "branding:manage");
	const normalized = hostname.trim().toLowerCase();
	if (!normalized) throw new AccessError("Domain is required", 400);

	const notificationEmail = process.env.RESEND_FROM_EMAIL?.trim();
	const appUrl = process.env.BETTER_AUTH_URL?.trim();
	if (!notificationEmail) {
		throw new Error("RESEND_FROM_EMAIL is required for domain requests");
	}
	if (!appUrl) {
		throw new Error("BETTER_AUTH_URL is required for domain requests");
	}

	const result = await createOrUpdateCustomDomain(workspaceId, normalized);
	const txtName = `_sleeksign.${result.hostname}`;
	const message = await buildDomainRequestEmail({
		hostname: result.hostname,
		txtName,
		txtValue: result.verificationToken,
		workspaceName: access.workspace?.name || "A SleekSign workspace",
		settingsUrl: new URL("/settings", appUrl).toString(),
	});
	await sendTransactionalEmail({
		to: notificationEmail,
		subject: message.subject,
		html: message.html,
	});

	await emitAuditEvent({
		organizationId: workspaceId,
		workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "domain.requested",
		chainKey: `workspace:${workspaceId}`,
		payload: { hostname: result.hostname, txtName },
		...getRequestAuditContext(headers),
	});
	return result;
}

export async function verifyDomain(
	headers: HeadersInit,
	workspaceId: string,
	domainId: string,
) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "branding:manage");
	const verified = await verifyCustomDomain(workspaceId, domainId);
	if (!verified) {
		throw new AccessError(
			"TXT record not found yet. Check the record name and value, then try again.",
			400,
		);
	}

	await emitAuditEvent({
		organizationId: workspaceId,
		workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "domain.verified",
		chainKey: `workspace:${workspaceId}`,
		payload: { domainId },
		...getRequestAuditContext(headers),
	});

	return { success: true };
}
