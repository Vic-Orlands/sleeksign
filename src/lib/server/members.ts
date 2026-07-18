import { and, eq, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { authInvitation, authMember, authUser } from "@/db/schema";
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
	await requireWorkspaceAccess(headers, workspaceId, "members:manage");
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
	await requireWorkspaceAccess(headers, workspaceId, "members:manage");
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

export async function updateMemberRole(
	headers: HeadersInit,
	workspaceId: string,
	memberId: string,
	role: string,
) {
	await requireWorkspaceAccess(headers, workspaceId, "owner");
	if (role !== "admin" && role !== "member") {
		throw new AccessError("Role must be Admin or Member", 400);
	}

	return auth.api.updateMemberRole({
		headers: asHeaders(headers),
		body: {
			memberId,
			role,
			organizationId: workspaceId,
		},
	});
}
