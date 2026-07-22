import { getRequestEvent } from "$app/server";
import {
	fail,
	redirect,
	type Action,
	type Actions,
	type RequestEvent,
} from "@sveltejs/kit";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { authMember, authOrganization, authUser, teams } from "@/db/schema";
import { AccessError, requireDocsSession } from "$lib/server-access";
import {
	hasAppPermission,
	ensureWorkspaceSetup,
	resolveWorkspaceAccess,
	type AppPermission,
	type ResolvedAccess,
} from "@/lib/enterprise-access";
import { emitAuditEvent, getRequestAuditContext } from "@/lib/audit";

export type AppAccess = {
	workspaceId: string;
	userId: string;
	membershipId: string;
	membershipRole: string;
	teamIds: string[];
	permissions: string[];
	defaultTeamId: string | null;
	workspaceName: string | null;
};

export type WorkspaceSummary = {
	id: string;
	name: string;
	slug: string;
};

export type TeamSummary = {
	id: string;
	name: string;
	slug: string;
	isDefault?: boolean;
};

type WorkspacePermission = "read" | "manage" | "owner" | AppPermission;

function toAppAccess(
	workspaceId: string,
	userId: string,
	resolved: ResolvedAccess,
): AppAccess {
	return {
		workspaceId,
		userId,
		membershipId: resolved.membership.id,
		membershipRole: resolved.membership.role,
		teamIds: resolved.teamIds,
		permissions: Array.from(resolved.permissions),
		defaultTeamId: resolved.defaultTeamId,
		workspaceName: resolved.workspace?.name || null,
	};
}

function assertAccessPermission(access: AppAccess, permission: WorkspacePermission) {
	if (permission === "owner") {
		if (access.membershipRole === "owner") return;
		throw new AccessError("Forbidden", 403);
	}

	const mapped: AppPermission =
		permission === "read"
			? "documents:view"
			: permission === "manage"
				? "documents:manage"
				: (permission as AppPermission);

	const ok = hasAppPermission(
		{
			permissions: new Set(access.permissions as AppPermission[]),
			membership: { role: access.membershipRole } as ResolvedAccess["membership"],
		},
		mapped,
	);
	if (!ok) throw new AccessError("Forbidden", 403);
}

export async function listUserWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
	const memberships = await db.query.authMember.findMany({
		where: eq(authMember.userId, userId),
	});
	if (memberships.length === 0) return [];

	const orgIds = memberships.map((membership) => membership.organizationId);
	const orgs = await db.query.authOrganization.findMany({
		where: inArray(authOrganization.id, orgIds),
	});

	return orgs.map((org) => ({
		id: org.id,
		name: org.name,
		slug: org.slug,
	}));
}

export async function listWorkspaceTeams(workspaceId: string): Promise<TeamSummary[]> {
	const rows = await db.query.teams.findMany({
		where: eq(teams.organizationId, workspaceId),
	});
	return rows
		.map((team) => ({
			id: team.id,
			name: team.name,
			slug: team.slug,
			isDefault: Boolean(team.isDefault),
		}))
		.sort((left, right) => {
			if (left.isDefault) return -1;
			if (right.isDefault) return 1;
			return left.name.localeCompare(right.name);
		});
}

/** Layout-only: session gate + one workspace resolve for the active org. */
export async function loadAppLayoutData() {
	const session = await requireDocsSession();
	const workspaceId = session.session.activeOrganizationId || "";
	const workspaces = await listUserWorkspaces(session.user.id);
	if (workspaces.length === 0) {
		redirect(303, "/auth/workspace");
	}

	let access: AppAccess | null = null;

	if (workspaceId) {
		const resolved = await resolveWorkspaceAccess(session.user.id, workspaceId, {
			ensureSetup: true,
		});
		if (resolved) {
			access = toAppAccess(workspaceId, session.user.id, resolved);
		}
	}

	const teamsByWorkspaceEntries = await Promise.all(
		workspaces.map(async (workspace) => {
			const rows = await listWorkspaceTeams(workspace.id);
			return [workspace.id, rows] as const;
		}),
	);
	const teamsByWorkspace = Object.fromEntries(teamsByWorkspaceEntries) as Record<
		string,
		TeamSummary[]
	>;
	const teamsList = workspaceId ? teamsByWorkspace[workspaceId] || [] : [];

	return {
		workspaceId: access?.workspaceId || "",
		access,
		workspaces,
		teams: teamsList,
		teamsByWorkspace,
		user: {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
			image: session.user.image ?? null,
		},
	};
}

/**
 * Form actions only. Uses hooks.locals.authSession (no second Better Auth getSession).
 * Resolves workspace permissions once for the mutation.
 */
export async function requireAppAccess(
	permission: WorkspacePermission = "read",
	event?: RequestEvent,
) {
	const requestEvent = event ?? getRequestEvent();
	const session = requestEvent.locals.authSession;
	if (!session) {
		redirect(303, "/signin");
	}

	const workspaceId = session.session.activeOrganizationId || "";
	if (!workspaceId) {
		throw new AccessError("No active workspace", 400);
	}

	const resolved = await resolveWorkspaceAccess(session.user.id, workspaceId);
	if (!resolved) {
		throw new AccessError("Forbidden", 403);
	}

	const access = toAppAccess(workspaceId, session.user.id, resolved);
	assertAccessPermission(access, permission);
	return {
		access,
		session,
		headers: requestEvent.request.headers,
	};
}

export function actionError(error: unknown, fallback = "Request failed") {
	if (error instanceof AccessError) {
		return fail(error.status, { error: error.message });
	}

	const message = error instanceof Error ? error.message : fallback;
	return fail(500, { error: message });
}

export function formString(data: FormData, key: string) {
	const value = data.get(key);
	return typeof value === "string" ? value.trim() : "";
}

export function asHeaders(headers: HeadersInit): Headers {
	return headers instanceof Headers ? headers : new Headers(headers);
}

export const createWorkspaceAction: Action = async ({ request }) => {
	const data = await request.formData();
	const name = formString(data, "name");
	if (!name) return fail(400, { error: "Workspace name required" });

	try {
		const event = getRequestEvent();
		const session = event.locals.authSession;
		if (!session) redirect(303, "/signin");

		const slug = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");

		if (!slug) return fail(400, { error: "Enter a valid workspace name" });

		const organization = await auth.api.createOrganization({
			headers: event.request.headers,
			body: { name, slug },
		});

		const organizationId =
			organization && typeof organization === "object" && "id" in organization
				? String((organization as { id: string }).id)
				: "";

		if (!organizationId) {
			throw new Error("Workspace creation did not return an ID");
		}

		const membership = await db.query.authMember.findFirst({
			where: eq(authMember.organizationId, organizationId),
		});
		if (!membership || membership.userId !== session.user.id) {
			throw new Error("Workspace owner membership was not created");
		}

		const { defaultTeamId } = await ensureWorkspaceSetup(
			organizationId,
			membership.id,
		);
		await db
			.update(authUser)
			.set({ lastWorkspaceId: organizationId })
			.where(eq(authUser.id, session.user.id));

		await auth.api.setActiveOrganization({
			headers: event.request.headers,
			body: { organizationId },
		});

		return {
			success: true,
			workspaceId: organizationId,
			defaultTeamId,
			message: "Workspace created",
		};
	} catch (error) {
		return actionError(error, "Unable to create workspace");
	}
};

/** Shared workspace chrome actions — merge into each app page's `actions`. */
export const workspaceActions: Actions = {
	switchWorkspace: async ({ request }) => {
		const data = await request.formData();
		const nextWorkspaceId = formString(data, "workspaceId");
		const nextTeamId = formString(data, "teamId");
		if (!nextWorkspaceId) return fail(400, { error: "Workspace required" });

		const event = getRequestEvent();
		if (!event.locals.authSession) redirect(303, "/signin");

		await auth.api.setActiveOrganization({
			headers: event.request.headers,
			body: { organizationId: nextWorkspaceId },
		});

		return {
			success: true,
			workspaceId: nextWorkspaceId,
			teamId: nextTeamId || "",
		};
	},

	createWorkspace: createWorkspaceAction,

	createTeam: async ({ request }) => {
		const data = await request.formData();
		const name = formString(data, "name");
		if (!name) return fail(400, { error: "Team name required" });

		try {
			const { access, headers } = await requireAppAccess("teams:manage");
			const normalizedSlug = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");

			const existing = await db.query.teams.findMany({
				where: eq(teams.organizationId, access.workspaceId),
			});
			if (
				normalizedSlug === "general" ||
				existing.some((team) => team.slug === normalizedSlug)
			) {
				throw new AccessError("That team already exists in this workspace", 409);
			}

			const id = nanoid();
			await db.insert(teams).values({
				id,
				organizationId: access.workspaceId,
				name,
				slug: normalizedSlug,
			});

			await emitAuditEvent({
				organizationId: access.workspaceId,
				workspaceId: access.workspaceId,
				actorType: "user",
				actorId: access.userId,
				eventType: "team.created",
				chainKey: `workspace:${access.workspaceId}`,
				payload: { teamId: id, name },
				...getRequestAuditContext(headers),
			});

			return { success: true, message: "Team created", teamId: id };
		} catch (error) {
			return actionError(error, "Unable to create team");
		}
	},
};
