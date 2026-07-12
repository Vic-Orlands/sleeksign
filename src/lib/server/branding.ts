import { eq } from "drizzle-orm";

import { db } from "@/db";
import { customDomains, organizationBranding } from "@/db/schema";
import {
	createOrUpdateCustomDomain,
	upsertOrganizationBranding,
	verifyCustomDomain,
} from "@/lib/branding";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
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

	const result = await createOrUpdateCustomDomain(workspaceId, normalized);
	await emitAuditEvent({
		organizationId: workspaceId,
		workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "domain.requested",
		chainKey: `workspace:${workspaceId}`,
		payload: { hostname: result.hostname },
		...getRequestAuditContext(headers),
	});
	return result;
}

export async function verifyDomain(
	headers: HeadersInit,
	workspaceId: string,
	domainId: string,
	verificationToken: string,
) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "branding:manage");
	const verified = await verifyCustomDomain(workspaceId, domainId, verificationToken);
	if (!verified) throw new AccessError("Unable to verify domain", 400);

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
