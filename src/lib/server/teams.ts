import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
	authMember,
	authUser,
	memberRoleAssignments,
	permissionRolePermissions,
	permissionRoles,
	teamMembers,
	teams,
} from "@/db/schema";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";
import { getSystemRoleDefinitions } from "@/lib/enterprise-access";
import { AccessError, requireWorkspaceAccess } from "@/lib/server-access";

export type TeamSummary = {
	id: string;
	name: string;
	slug: string;
	isDefault?: boolean;
	memberIds?: string[];
};

export async function listTeams(
	headers: HeadersInit,
	workspaceId: string,
	options?: { summaryOnly?: boolean },
) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "read");

	if (options?.summaryOnly) {
		const teamRows = await db.query.teams.findMany({
			where: eq(teams.organizationId, access.workspaceId),
		});
		return {
			teams: teamRows as TeamSummary[],
			members: [],
			roles: [],
			permissions: Array.from(access.permissions),
		};
	}

	const [teamRows, teamMemberships, members, roles, assignments, rolePermissions] =
		await Promise.all([
			db.query.teams.findMany({
				where: eq(teams.organizationId, access.workspaceId),
			}),
			db.query.teamMembers.findMany({
				where: eq(teamMembers.organizationId, access.workspaceId),
			}),
			db.query.authMember.findMany({
				where: eq(authMember.organizationId, access.workspaceId),
			}),
			db.query.permissionRoles.findMany({
				where: eq(permissionRoles.organizationId, access.workspaceId),
			}),
			db.query.memberRoleAssignments.findMany({
				where: eq(memberRoleAssignments.organizationId, access.workspaceId),
			}),
			db.query.permissionRolePermissions.findMany(),
		]);

	const users = members.length
		? await db
				.select()
				.from(authUser)
				.where(inArray(authUser.id, members.map((member) => member.userId)))
		: [];

	return {
		teams: teamRows.map((team) => ({
			...team,
			memberIds: teamMemberships
				.filter((membership) => membership.teamId === team.id)
				.map((membership) => membership.memberId),
		})) as TeamSummary[],
		members: members.map((member) => ({
			...member,
			user: users.find((user) => user.id === member.userId) || null,
			teamIds: teamMemberships
				.filter((membership) => membership.memberId === member.id)
				.map((membership) => membership.teamId),
			roleAssignments: assignments
				.filter((assignment) => assignment.memberId === member.id)
				.map((assignment) => ({
					...assignment,
					role: roles.find((role) => role.id === assignment.roleId) || null,
				})),
		})),
		roles: roles.map((role) => ({
			...role,
			permissions: rolePermissions
				.filter((permission) => permission.roleId === role.id)
				.map((permission) => permission.permission),
		})),
		systemRoles: getSystemRoleDefinitions(),
		permissions: Array.from(access.permissions),
	};
}

export async function createTeam(
	headers: HeadersInit,
	workspaceId: string,
	name: string,
	description?: string,
) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "teams:manage", {
		ensureEnterpriseSetup: true,
	});
	const normalizedName = name.trim();
	if (!normalizedName) {
		throw new AccessError("Team name is required", 400);
	}

	const normalizedSlug = normalizedName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
	const existingTeams = await db.query.teams.findMany({
		where: eq(teams.organizationId, workspaceId),
	});

	if (
		normalizedSlug === "general" ||
		existingTeams.some((team) => team.slug === normalizedSlug)
	) {
		throw new AccessError("That team already exists in this workspace", 409);
	}

	const id = nanoid();
	await db.insert(teams).values({
		id,
		organizationId: workspaceId,
		name: normalizedName,
		slug: normalizedSlug,
		description: description?.trim() || null,
	});

	await emitAuditEvent({
		organizationId: workspaceId,
		workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "team.created",
		chainKey: `workspace:${workspaceId}`,
		payload: { teamId: id, name: normalizedName },
		...getRequestAuditContext(headers),
	});

	return { id };
}

export async function deleteTeam(headers: HeadersInit, teamId: string, workspaceId: string) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "teams:manage");
	const team = await db.query.teams.findFirst({
		where: eq(teams.id, teamId),
	});

	if (!team || team.organizationId !== workspaceId) {
		throw new AccessError("Team not found", 404);
	}

	if (team.isDefault) {
		throw new AccessError("Cannot delete the default team", 400);
	}

	await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
	await db.delete(teams).where(eq(teams.id, teamId));

	await emitAuditEvent({
		organizationId: workspaceId,
		workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "team.deleted",
		chainKey: `workspace:${workspaceId}`,
		payload: { teamId },
		...getRequestAuditContext(headers),
	});
}

export async function saveTeamMembers(
	headers: HeadersInit,
	workspaceId: string,
	teamId: string,
	memberIds: string[],
) {
	const access = await requireWorkspaceAccess(headers, workspaceId, "teams:manage");
	const team = await db.query.teams.findFirst({
		where: eq(teams.id, teamId),
	});

	if (!team || team.organizationId !== workspaceId) {
		throw new AccessError("Team not found", 404);
	}

	await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
	if (memberIds.length > 0) {
		await db.insert(teamMembers).values(
			memberIds.map((memberId) => ({
				id: nanoid(),
				organizationId: workspaceId,
				teamId,
				memberId,
			})),
		);
	}

	await emitAuditEvent({
		organizationId: workspaceId,
		teamId,
		workspaceId,
		actorType: "user",
		actorId: access.membership.userId,
		eventType: "team.updated",
		chainKey: `workspace:${workspaceId}`,
		payload: { teamId, memberCount: memberIds.length },
		...getRequestAuditContext(headers),
	});
}
