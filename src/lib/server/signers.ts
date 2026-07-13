import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import { signerGroups, signerGroupMembers, teams, workspaceSigners } from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export async function listDirectorySigners(headers: HeadersInit, workspaceId: string) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "signers:view");
	const signerRows = await db.query.workspaceSigners.findMany({
		where: eq(workspaceSigners.organizationId, access.workspaceId),
		with: { team: true },
	});

	return signerRows
		.filter((signer) =>
			access.permissions.has("signers:view_all")
				? true
				: !signer.teamId || access.teamIds.includes(signer.teamId),
		)
		.map((signer) => ({
			id: signer.id,
			name: signer.name,
			email: signer.email,
			title: signer.title,
			type: signer.type,
			status: signer.status,
			teamId: signer.teamId,
			teamName: signer.team?.name || null,
			createdAt: signer.createdAt,
			updatedAt: signer.updatedAt,
		}));
}

export async function listSignerGroups(headers: HeadersInit, workspaceId: string) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "signers:view");
	const groups = await db.query.signerGroups.findMany({
		where: eq(signerGroups.organizationId, access.workspaceId),
		with: {
			members: {
				with: {
					signer: true,
				},
			},
		},
	});

	return groups.map((group) => ({
		id: group.id,
		name: group.name,
		description: group.description,
		signers: (group.members || [])
			.map((member) => member.signer)
			.filter(Boolean)
			.map((signer) => ({
				id: signer!.id,
				name: signer!.name,
				email: signer!.email,
			})),
	}));
}

export async function createDirectorySigner(
	headers: HeadersInit,
	input: {
		workspaceId: string;
		name: string;
		email: string;
		title?: string;
		teamId?: string | null;
	},
) {
	const access = await requireWorkspaceAccess(headers, input.workspaceId, "signers:manage");
	const normalizedEmail = input.email.trim().toLowerCase();
	const nextTeamId = input.teamId || null;

	if (nextTeamId) {
		const team = await db.query.teams.findFirst({
			where: and(eq(teams.id, nextTeamId), eq(teams.organizationId, input.workspaceId)),
		});
		if (!team) throw new AccessError("Team not found", 404);
	}

	const existingSigner = await db.query.workspaceSigners.findFirst({
		where: and(
			eq(workspaceSigners.organizationId, input.workspaceId),
			eq(workspaceSigners.email, normalizedEmail),
		),
	});
	if (existingSigner) {
		throw new AccessError("A signer with that email already exists in this workspace", 409);
	}

	const id = nanoid();
	await db.insert(workspaceSigners).values({
		id,
		organizationId: input.workspaceId,
		name: input.name.trim(),
		email: normalizedEmail,
		title: input.title?.trim() || null,
		teamId: nextTeamId,
		type: "external",
		status: "active",
	});

	await emitAuditEvent({
		organizationId: input.workspaceId,
		workspaceId: input.workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "signer.created",
		chainKey: `workspace:${input.workspaceId}`,
		payload: { signerId: id, email: normalizedEmail },
		...getRequestAuditContext(headers),
	});

	return { id };
}

export async function deleteDirectorySigner(
	headers: HeadersInit,
	workspaceId: string,
	signerId: string,
) {
	await requireWorkspaceAccess(headers, workspaceId, "signers:manage");
	await db.delete(workspaceSigners).where(eq(workspaceSigners.id, signerId));
}

export async function createSignerGroup(
	headers: HeadersInit,
	input: {
		workspaceId: string;
		name: string;
		description?: string;
		signerIds?: string[];
	},
) {
	const access = await requireWorkspaceAccess(headers, input.workspaceId, "signers:manage");
	const id = nanoid();
	await db.insert(signerGroups).values({
		id,
		organizationId: input.workspaceId,
		name: input.name.trim(),
		description: input.description?.trim() || null,
	});

	for (const signerId of input.signerIds || []) {
		await db.insert(signerGroupMembers).values({
			id: nanoid(),
			groupId: id,
			signerId,
		});
	}

	await emitAuditEvent({
		organizationId: input.workspaceId,
		workspaceId: input.workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "signer-group.created",
		chainKey: `workspace:${input.workspaceId}`,
		payload: { groupId: id },
		...getRequestAuditContext(headers),
	});

	return { id };
}

export async function updateSignerGroup(
	headers: HeadersInit,
	input: {
		workspaceId: string;
		groupId: string;
		name: string;
		description?: string | null;
		signerIds: string[];
	},
) {
	const access = await requireWorkspaceAccess(headers, input.workspaceId, "signers:manage");
	const group = await db.query.signerGroups.findFirst({
		where: and(
			eq(signerGroups.id, input.groupId),
			eq(signerGroups.organizationId, input.workspaceId),
		),
	});
	if (!group) throw new AccessError("Signer group not found", 404);

	const nextSignerIds = [...new Set(input.signerIds.filter(Boolean))];
	if (nextSignerIds.length === 0) {
		throw new AccessError("Select at least one signer", 400);
	}

	const signerRows = await db.query.workspaceSigners.findMany({
		where: eq(workspaceSigners.organizationId, input.workspaceId),
	});
	const signerIdSet = new Set(signerRows.map((signer) => signer.id));
	if (nextSignerIds.some((signerId) => !signerIdSet.has(signerId))) {
		throw new AccessError("One or more signers were not found", 404);
	}

	await db
		.update(signerGroups)
		.set({
			name: input.name.trim() || group.name,
			description: input.description?.trim() || null,
			updatedAt: new Date(),
		})
		.where(eq(signerGroups.id, input.groupId));

	await db.delete(signerGroupMembers).where(eq(signerGroupMembers.groupId, input.groupId));
	await db.insert(signerGroupMembers).values(
		nextSignerIds.map((signerId) => ({
			id: nanoid(),
			groupId: input.groupId,
			signerId,
		})),
	);

	await emitAuditEvent({
		organizationId: input.workspaceId,
		workspaceId: input.workspaceId,
		teamId: group.teamId,
		actorType: "user",
		actorId: access.membership.userId,
		actorEmail: access.session.user.email,
		eventType: "signer-group.updated",
		chainKey: `workspace:${input.workspaceId}`,
		payload: {
			groupId: input.groupId,
			signerCount: nextSignerIds.length,
		},
		...getRequestAuditContext(headers),
	});

	return { id: input.groupId };
}

export async function deleteSignerGroup(
	headers: HeadersInit,
	workspaceId: string,
	groupId: string,
) {
	await requireWorkspaceAccess(headers, workspaceId, "signers:manage");
	await db.delete(signerGroupMembers).where(eq(signerGroupMembers.groupId, groupId));
	await db.delete(signerGroups).where(eq(signerGroups.id, groupId));
}

export async function deleteSigningSession(headers: HeadersInit, sessionId: string) {
	const { sessions } = await import("@/db/schema");
	const row = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
		with: { document: true },
	});
	if (!row?.document) throw new AccessError("Session not found", 404);

	await requireWorkspaceAccess(headers, row.document.workspaceId, "manage");
	await db
		.update(sessions)
		.set({ deletedAt: new Date() })
		.where(eq(sessions.id, sessionId));
}
