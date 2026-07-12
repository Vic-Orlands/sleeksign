import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
	authInvitation,
	authMember,
	authUser,
	memberRoleAssignments,
	permissionRoles,
} from "@/db/schema";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

function asHeaders(headers: HeadersInit): Headers {
	return headers instanceof Headers ? headers : new Headers(headers);
}

export async function listMembers(headers: HeadersInit, workspaceId: string) {
	await requireWorkspaceAccess(headers, workspaceId, "read");
	const members = await db.query.authMember.findMany({
		where: eq(authMember.organizationId, workspaceId),
	});
	const userIds = members.map((member) => member.userId);
	const users =
		userIds.length > 0
			? await db.query.authUser.findMany({
					where: inArray(authUser.id, userIds),
				})
			: [];
	const usersById = new Map(users.map((user) => [user.id, user]));

	return members.map((member) => {
		const user = usersById.get(member.userId);
		return {
			id: member.id,
			role: member.role,
			userId: member.userId,
			user: user
				? {
						id: user.id,
						name: user.name,
						email: user.email,
						image: user.image,
					}
				: null,
		};
	});
}

export async function listInvitations(headers: HeadersInit, workspaceId: string) {
	await requireWorkspaceAccess(headers, workspaceId, "read");
	return db.query.authInvitation.findMany({
		where: and(
			eq(authInvitation.organizationId, workspaceId),
			eq(authInvitation.status, "pending"),
		),
	});
}

export async function inviteMember(
	headers: HeadersInit,
	workspaceId: string,
	email: string,
	role: string,
) {
	await requireWorkspaceAccess(headers, workspaceId, "owner");
	const normalized = email.trim().toLowerCase();
	if (!normalized) throw new AccessError("Email is required", 400);

	await auth.api.createInvitation({
		headers: asHeaders(headers),
		body: {
			email: normalized,
			role: role === "admin" ? "admin" : "member",
			organizationId: workspaceId,
		},
	});
}

export async function removeMember(
	headers: HeadersInit,
	workspaceId: string,
	memberId: string,
) {
	await requireWorkspaceAccess(headers, workspaceId, "owner");
	await auth.api.removeMember({
		headers: asHeaders(headers),
		body: {
			memberIdOrEmail: memberId,
			organizationId: workspaceId,
		},
	});
}

export async function cancelInvite(headers: HeadersInit, invitationId: string) {
	await auth.api.cancelInvitation({
		headers: asHeaders(headers),
		body: { invitationId },
	});
}

export async function listPermissionRoles(headers: HeadersInit, workspaceId: string) {
	await requireWorkspaceAccess(headers, workspaceId, "read");
	return db.query.permissionRoles.findMany({
		where: eq(permissionRoles.organizationId, workspaceId),
	});
}

export async function listRoleAssignments(headers: HeadersInit, workspaceId: string) {
	await requireWorkspaceAccess(headers, workspaceId, "read");
	return db.query.memberRoleAssignments.findMany({
		where: eq(memberRoleAssignments.organizationId, workspaceId),
	});
}

export async function assignMemberRole(
	headers: HeadersInit,
	workspaceId: string,
	memberId: string,
	roleId: string,
	teamId?: string | null,
) {
	await requireWorkspaceAccess(headers, workspaceId, "owner");
	const existing = await db.query.memberRoleAssignments.findFirst({
		where: and(
			eq(memberRoleAssignments.organizationId, workspaceId),
			eq(memberRoleAssignments.memberId, memberId),
			eq(memberRoleAssignments.roleId, roleId),
		),
	});

	if (existing) {
		await db
			.update(memberRoleAssignments)
			.set({ teamId: teamId || null })
			.where(eq(memberRoleAssignments.id, existing.id));
		return existing.id;
	}

	const assignmentId = nanoid();
	await db.insert(memberRoleAssignments).values({
		id: assignmentId,
		organizationId: workspaceId,
		memberId,
		roleId,
		teamId: teamId || null,
		createdAt: new Date(),
	});
	return assignmentId;
}
