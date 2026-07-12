import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requestDomain, saveBranding, verifyDomain } from "$lib/server/branding";
import {
	assignMemberRole,
	cancelInvite,
	inviteMember,
	removeMember,
} from "$lib/server/members";
import { createTeam, deleteTeam, saveTeamMembers } from "$lib/server/teams";
import { loadSettingsData } from "$lib/server/page-data";
import {
	actionError,
	formString,
	requireAppAccess,
	workspaceActions,
} from "$lib/server/workspace";

export const load: PageServerLoad = async ({ parent }) => {
	const { workspaceId, access, user } = await parent();
	if (!workspaceId || !access) {
		return {
			workspaceId: workspaceId || "",
			user,
			teams: [],
			members: [],
			invitations: [],
			roles: [],
			systemRoles: [],
			branding: null,
			domains: [],
			permissions: [],
		};
	}

	try {
		const data = await loadSettingsData(access);
		return { workspaceId, user, ...data };
	} catch (error) {
		return {
			workspaceId,
			user,
			teams: [],
			members: [],
			invitations: [],
			roles: [],
			systemRoles: [],
			branding: null,
			domains: [],
			permissions: [],
			error: error instanceof Error ? error.message : "Failed to load settings",
		};
	}
};

export const actions: Actions = {
	...workspaceActions,

	inviteMember: async ({ request }) => {
		const data = await request.formData();
		const email = formString(data, "email");
		const role = formString(data, "role") || "member";
		if (!email) return fail(400, { error: "Email is required" });

		try {
			const { access } = await requireAppAccess("owner");
			await inviteMember(request.headers, access.workspaceId, email, role);
			return { success: true, message: "Invitation sent" };
		} catch (error) {
			return actionError(error, "Failed to send invite");
		}
	},

	removeMember: async ({ request }) => {
		const data = await request.formData();
		const memberId = formString(data, "memberId");
		if (!memberId) return fail(400, { error: "Member ID required" });

		try {
			const { access } = await requireAppAccess("owner");
			await removeMember(request.headers, access.workspaceId, memberId);
			return { success: true, message: "Member removed" };
		} catch (error) {
			return actionError(error, "Failed to remove member");
		}
	},

	cancelInvite: async ({ request }) => {
		const data = await request.formData();
		const invitationId = formString(data, "invitationId");
		if (!invitationId) return fail(400, { error: "Invitation ID required" });

		try {
			await requireAppAccess("owner");
			await cancelInvite(request.headers, invitationId);
			return { success: true, message: "Invitation cancelled" };
		} catch (error) {
			return actionError(error, "Unable to cancel invitation");
		}
	},

	createTeam: async ({ request }) => {
		const data = await request.formData();
		const name = formString(data, "name");
		if (!name) return fail(400, { error: "Team name required" });

		try {
			const { access } = await requireAppAccess("teams:manage");
			await createTeam(request.headers, access.workspaceId, name);
			return { success: true, message: "Team created" };
		} catch (error) {
			return actionError(error, "Unable to create team");
		}
	},

	deleteTeam: async ({ request }) => {
		const data = await request.formData();
		const teamId = formString(data, "teamId");
		if (!teamId) return fail(400, { error: "Team ID required" });

		try {
			const { access } = await requireAppAccess("teams:manage");
			await deleteTeam(request.headers, teamId, access.workspaceId);
			return { success: true, message: "Team deleted" };
		} catch (error) {
			return actionError(error, "Failed to delete team");
		}
	},

	saveTeamMembers: async ({ request }) => {
		const data = await request.formData();
		const teamId = formString(data, "teamId");
		const memberIds = data.getAll("memberIds").filter((v): v is string => typeof v === "string");
		if (!teamId) return fail(400, { error: "Team ID required" });

		try {
			const { access } = await requireAppAccess("teams:manage");
			await saveTeamMembers(request.headers, access.workspaceId, teamId, memberIds);
			return { success: true, message: "Team members saved" };
		} catch (error) {
			return actionError(error, "Failed to save team members");
		}
	},

	saveBranding: async ({ request }) => {
		const data = await request.formData();

		try {
			const { access } = await requireAppAccess("branding:manage");
			await saveBranding(request.headers, access.workspaceId, {
				senderName: formString(data, "senderName"),
				primaryColor: formString(data, "primaryColor"),
				secondaryColor: formString(data, "secondaryColor"),
				neutralColor: formString(data, "neutralColor"),
				accentColor: formString(data, "accentColor"),
				supportEmail: formString(data, "supportEmail"),
				logoUrl: formString(data, "logoUrl"),
			});
			return { success: true, message: "Branding saved" };
		} catch (error) {
			return actionError(error, "Failed to save branding");
		}
	},

	requestDomain: async ({ request }) => {
		const data = await request.formData();
		const hostname = formString(data, "hostname");
		if (!hostname) return fail(400, { error: "Hostname required" });

		try {
			const { access } = await requireAppAccess("branding:manage");
			const result = await requestDomain(request.headers, access.workspaceId, hostname);
			return { success: true, message: "Domain requested", domain: result };
		} catch (error) {
			return actionError(error, "Failed to request domain");
		}
	},

	verifyDomain: async ({ request }) => {
		const data = await request.formData();
		const domainId = formString(data, "domainId");
		const verificationToken = formString(data, "verificationToken");
		if (!domainId || !verificationToken) {
			return fail(400, { error: "Domain ID and token required" });
		}

		try {
			const { access } = await requireAppAccess("branding:manage");
			await verifyDomain(request.headers, access.workspaceId, domainId, verificationToken);
			return { success: true, message: "Domain verified" };
		} catch (error) {
			return actionError(error, "Failed to verify domain");
		}
	},

	assignRole: async ({ request }) => {
		const data = await request.formData();
		const memberId = formString(data, "memberId");
		const roleId = formString(data, "roleId");
		const teamId = formString(data, "teamId") || null;
		if (!memberId || !roleId) {
			return fail(400, { error: "Member and role required" });
		}

		try {
			const { access } = await requireAppAccess("owner");
			await assignMemberRole(request.headers, access.workspaceId, memberId, roleId, teamId);
			return { success: true, message: "Role assigned" };
		} catch (error) {
			return actionError(error, "Failed to assign role");
		}
	},
};
