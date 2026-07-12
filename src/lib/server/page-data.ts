import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import {
	authInvitation,
	authMember,
	authUser,
	customDomains,
	documents,
	memberRoleAssignments,
	organizationBranding,
	permissionRolePermissions,
	permissionRoles,
	signerGroups,
	teamMembers,
	teams,
	workspaceSigners,
} from "@/db/schema";
import { serializeDocumentActivity } from "@/lib/dashboard-activity";
import { getSystemRoleDefinitions, hasAppPermission } from "@/lib/enterprise-access";
import { deriveSignerRoles, parseRoleConfigs } from "@/lib/field-utils";
import type { AppAccess } from "$lib/server/workspace";
import type { DocumentRecord } from "$lib/components/docs/types";
import { AccessError } from "$lib/server-access";

function documentScope(access: AppAccess) {
	return and(
		eq(documents.workspaceId, access.workspaceId),
		hasAppPermission(
			{
				permissions: new Set(access.permissions as never),
				membership: { role: access.membershipRole } as never,
			},
			"documents:view_all",
		)
			? undefined
			: access.teamIds.length > 0
				? or(inArray(documents.teamId, access.teamIds), isNull(documents.teamId))
				: isNull(documents.teamId),
	);
}

export async function listDocumentsForAccess(
	access: AppAccess,
	options?: { includeArchived?: boolean; includeDeleted?: boolean },
): Promise<DocumentRecord[]> {
	const includeArchived = options?.includeArchived ?? true;
	const includeDeleted = options?.includeDeleted ?? true;

	const docs = await db.query.documents.findMany({
		where: and(
			documentScope(access),
			includeArchived ? undefined : isNull(documents.archivedAt),
			includeDeleted ? undefined : isNull(documents.deletedAt),
		),
		orderBy: [desc(documents.createdAt)],
		with: {
			sessions: true,
			fields: true,
			packets: {
				with: {
					copies: true,
				},
			},
		},
	});

	return docs.map((doc) => {
		const roleConfigs = parseRoleConfigs(doc.roleConfigs);
		return serializeDocumentActivity({
			...doc,
			signerRoles: deriveSignerRoles(roleConfigs),
			roleConfigs,
			fields: (doc.fields || []).map((field) => ({
				...field,
				assigneeRole: field.assigneeRole || "",
			})),
			fileUrl:
				doc.uploadStatus === "ready" && doc.storageKey
					? `/api/documents/${doc.id}/file`
					: null,
		}) as DocumentRecord;
	});
}

export async function getDocumentForAccess(
	access: AppAccess,
	documentId: string,
): Promise<DocumentRecord> {
	const doc = await db.query.documents.findFirst({
		where: eq(documents.id, documentId),
		with: {
			fields: true,
			sessions: true,
			packets: {
				with: { copies: true },
			},
		},
	});

	if (!doc || doc.workspaceId !== access.workspaceId) {
		throw new AccessError("Not found", 404);
	}

	if (
		doc.teamId &&
		!hasAppPermission(
			{
				permissions: new Set(access.permissions as never),
				membership: { role: access.membershipRole } as never,
			},
			"documents:view_all",
		) &&
		!access.teamIds.includes(doc.teamId)
	) {
		throw new AccessError("Forbidden", 403);
	}

	const roleConfigs = parseRoleConfigs(doc.roleConfigs);
	return serializeDocumentActivity({
		...doc,
		signerRoles: deriveSignerRoles(roleConfigs),
		roleConfigs,
		fields: (doc.fields || []).map((field) => ({
			...field,
			assigneeRole: field.assigneeRole || "",
		})),
		fileUrl:
			doc.uploadStatus === "ready" && doc.storageKey
				? `/api/documents/${doc.id}/file`
				: null,
	}) as DocumentRecord;
}

export async function loadSignersData(access: AppAccess) {
	const [documentsList, signerRows, groups, teamRows] = await Promise.all([
		listDocumentsForAccess(access, { includeArchived: true, includeDeleted: true }),
		db.query.workspaceSigners.findMany({
			where: eq(workspaceSigners.organizationId, access.workspaceId),
			with: { team: true },
		}),
		db.query.signerGroups.findMany({
			where: eq(signerGroups.organizationId, access.workspaceId),
			with: {
				members: {
					with: { signer: true },
				},
			},
		}),
		db.query.teams.findMany({
			where: eq(teams.organizationId, access.workspaceId),
		}),
	]);

	const canViewAll = access.permissions.includes("signers:view_all");

	return {
		documents: documentsList,
		directorySigners: signerRows
			.filter((signer) =>
				canViewAll ? true : !signer.teamId || access.teamIds.includes(signer.teamId),
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
			})),
		signerGroups: groups.map((group) => ({
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
		})),
		teams: teamRows,
	};
}

export async function loadSettingsData(access: AppAccess) {
	const [
		teamRows,
		teamMemberships,
		members,
		roles,
		assignments,
		rolePermissions,
		invitations,
		brandingRow,
		domains,
	] = await Promise.all([
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
		db.query.authInvitation.findMany({
			where: and(
				eq(authInvitation.organizationId, access.workspaceId),
				eq(authInvitation.status, "pending"),
			),
		}),
		db.query.organizationBranding.findFirst({
			where: eq(organizationBranding.organizationId, access.workspaceId),
		}),
		db.query.customDomains.findMany({
			where: eq(customDomains.organizationId, access.workspaceId),
		}),
	]);

	const users = members.length
		? await db
				.select()
				.from(authUser)
				.where(inArray(authUser.id, members.map((member) => member.userId)))
		: [];

	const branding = brandingRow
		? {
				senderName: brandingRow.senderName || "SleekSign",
				primaryColor: brandingRow.primaryColor || "#18181b",
				secondaryColor: brandingRow.secondaryColor || "#f97316",
				neutralColor: brandingRow.neutralColor || "#f7f5f1",
				accentColor: brandingRow.accentColor || "#ea580c",
				supportEmail: brandingRow.supportEmail || "",
				logoUrl: brandingRow.logoUrl || "",
			}
		: {
				senderName: "SleekSign",
				primaryColor: "#18181b",
				secondaryColor: "#f97316",
				neutralColor: "#f7f5f1",
				accentColor: "#ea580c",
				supportEmail: "",
				logoUrl: "",
			};

	return {
		teams: teamRows.map((team) => ({
			...team,
			memberIds: teamMemberships
				.filter((membership) => membership.teamId === team.id)
				.map((membership) => membership.memberId),
		})),
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
		permissions: access.permissions,
		invitations,
		branding,
		domains,
	};
}
