import { fail } from "@sveltejs/kit";
import { and, eq, isNotNull } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "@/db";
import { authAccount } from "@/db/schema";
import { auth } from "$lib/auth";
import {
	buildProfileAvatarKey,
	putObjectBytes,
} from "$lib/r2-storage";
import { requestDomain, saveBranding, verifyDomain } from "$lib/server/branding";
import {
	cancelInvite,
	inviteMember,
	removeMember,
	updateMemberRole,
} from "$lib/server/members";
import {
	addTeamMembers,
	createTeam,
	deleteTeam,
	removeTeamMember,
} from "$lib/server/teams";
import { loadSettingsData } from "$lib/server/page-data";
import {
	actionError,
	formString,
	requireAppAccess,
	workspaceActions,
} from "$lib/server/workspace";

export const load: PageServerLoad = async ({ parent }) => {
	const { workspaceId, access, user } = await parent();
	const credentialAccount = user
		? await db.query.authAccount.findFirst({
				where: and(
					eq(authAccount.userId, user.id),
					eq(authAccount.providerId, "credential"),
					isNotNull(authAccount.password),
				),
			})
		: null;
	if (!workspaceId || !access) {
		return {
			workspaceId: workspaceId || "",
			user,
			teams: [],
			members: [],
			invitations: [],
			branding: null,
			domains: [],
			permissions: [],
			membershipRole: "",
			hasPassword: Boolean(credentialAccount),
		};
	}

	try {
		const data = await loadSettingsData(access);
		return {
			workspaceId,
			user,
			hasPassword: Boolean(credentialAccount),
			membershipRole: access.membershipRole,
			...data,
		};
	} catch (error) {
		return {
			workspaceId,
			user,
			teams: [],
			members: [],
			invitations: [],
			branding: null,
			domains: [],
			permissions: [],
			membershipRole: access.membershipRole,
			hasPassword: Boolean(credentialAccount),
			error: error instanceof Error ? error.message : "Failed to load settings",
		};
	}
};

export const actions: Actions = {
	...workspaceActions,

	updateAvatar: async ({ request }) => {
		const data = await request.formData();
		const avatar = data.get("avatar");
		if (!(avatar instanceof File) || avatar.size === 0) {
			return fail(400, { error: "Choose an image to upload" });
		}

		const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
		if (!supportedTypes.has(avatar.type)) {
			return fail(400, { error: "Use a JPG, PNG, or WebP image" });
		}
		if (avatar.size > 5 * 1024 * 1024) {
			return fail(400, { error: "Avatar images must be smaller than 5 MB" });
		}

		try {
			const session = await auth.api.getSession({ headers: request.headers });
			if (!session?.user) return fail(401, { error: "Sign in to update your avatar" });

			await putObjectBytes(
				buildProfileAvatarKey(session.user.id),
				new Uint8Array(await avatar.arrayBuffer()),
				{
					contentType: avatar.type,
					contentDisposition: "inline",
				},
			);
			await auth.api.updateUser({
				headers: request.headers,
				body: {
					image: `/api/profile/avatar/${session.user.id}?v=${Date.now()}`,
				},
			});
			return { success: true, message: "Avatar updated" };
		} catch (error) {
			return actionError(error, "Failed to update avatar");
		}
	},

	updateProfile: async ({ request }) => {
		const data = await request.formData();
		const name = formString(data, "name");
		if (name.length < 2 || name.length > 80) {
			return fail(400, { error: "Name must be between 2 and 80 characters" });
		}

		try {
			await auth.api.updateUser({
				headers: request.headers,
				body: { name },
			});
			return { success: true, message: "Profile updated" };
		} catch (error) {
			return actionError(error, "Failed to update profile");
		}
	},

	changePassword: async ({ request }) => {
		const data = await request.formData();
		const currentPassword = formString(data, "currentPassword");
		const newPassword = formString(data, "newPassword");
		const confirmPassword = formString(data, "confirmPassword");

		if (!currentPassword || newPassword.length < 6) {
			return fail(400, { error: "Enter your current password and a new password of at least 6 characters" });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { error: "New passwords do not match" });
		}

		try {
			await auth.api.changePassword({
				headers: request.headers,
				body: {
					currentPassword,
					newPassword,
					revokeOtherSessions: true,
				},
			});
			return { success: true, message: "Password changed" };
		} catch (error) {
			return actionError(error, "Failed to change password");
		}
	},

	inviteMember: async ({ request }) => {
		const data = await request.formData();
		const email = formString(data, "email");
		const role = formString(data, "role") || "member";
		if (!email) return fail(400, { error: "Email is required" });

		try {
			const { access } = await requireAppAccess("members:manage");
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
			const { access } = await requireAppAccess("members:manage");
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
			await requireAppAccess("members:manage");
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

	addTeamMembers: async ({ request }) => {
		const data = await request.formData();
		const teamId = formString(data, "teamId");
		const memberIds = data.getAll("memberIds").filter((v): v is string => typeof v === "string");
		if (!teamId) return fail(400, { error: "Team ID required" });

		try {
			const { access } = await requireAppAccess("teams:manage");
			await addTeamMembers(request.headers, access.workspaceId, teamId, memberIds);
			if (access.membershipRole === "owner") {
				for (const memberId of memberIds) {
					const role = formString(data, `role:${memberId}`);
					if (role) {
						await updateMemberRole(request.headers, access.workspaceId, memberId, role);
					}
				}
			}
			return { success: true, message: "Members added to team" };
		} catch (error) {
			return actionError(error, "Failed to add team members");
		}
	},

	removeTeamMember: async ({ request }) => {
		const data = await request.formData();
		const teamId = formString(data, "teamId");
		const memberId = formString(data, "memberId");
		if (!teamId || !memberId) {
			return fail(400, { error: "Team and member are required" });
		}

		try {
			const { access } = await requireAppAccess("teams:manage");
			await removeTeamMember(request.headers, access.workspaceId, teamId, memberId);
			return { success: true, message: "Member removed from team" };
		} catch (error) {
			return actionError(error, "Failed to remove team member");
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
		if (!domainId) return fail(400, { error: "Domain ID required" });

		try {
			const { access } = await requireAppAccess("branding:manage");
			await verifyDomain(request.headers, access.workspaceId, domainId);
			return { success: true, message: "Domain verified" };
		} catch (error) {
			return actionError(error, "Failed to verify domain");
		}
	},

	updateMemberRole: async ({ request }) => {
		const data = await request.formData();
		const memberId = formString(data, "memberId");
		const role = formString(data, "role");
		if (!memberId || !role) {
			return fail(400, { error: "Member and role required" });
		}

		try {
			const { access } = await requireAppAccess("owner");
			await updateMemberRole(request.headers, access.workspaceId, memberId, role);
			return { success: true, message: "Role updated" };
		} catch (error) {
			return actionError(error, "Failed to update role");
		}
	},
};
