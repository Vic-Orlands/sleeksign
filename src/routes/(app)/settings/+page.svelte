<script lang="ts">
	import { enhance } from "$app/forms";
	import { toast } from "svelte-sonner";
	import Buildings from "phosphor-svelte/lib/Buildings";
	import Envelope from "phosphor-svelte/lib/Envelope";
	import Globe from "phosphor-svelte/lib/Globe";
	import Palette from "phosphor-svelte/lib/Palette";
	import ShieldCheck from "phosphor-svelte/lib/ShieldCheck";
	import Users from "phosphor-svelte/lib/Users";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import { cn } from "$lib/utils";
	import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";
	import type { ActionResult, SubmitFunction } from "@sveltejs/kit";

	type Section = "members" | "teams" | "invites" | "branding" | "domains" | "roles";
	type TeamPayload = { id: string; name: string; isDefault?: boolean; memberIds?: string[] };
	type MemberPayload = {
		id: string;
		role: string;
		user?: { name?: string | null; email?: string | null; image?: string | null } | null;
		teamIds?: string[];
		roleAssignments?: Array<{ roleId: string; role?: { name?: string } | null }>;
	};
	type InvitationPayload = { id: string; email: string; role: string; status: string };
	type RolePayload = { id: string; name: string; description?: string | null; permissions?: string[] };
	type DomainPayload = {
		id: string;
		hostname: string;
		status: string;
		verificationToken?: string | null;
	};
	type BrandingPayload = {
		senderName: string;
		primaryColor: string;
		secondaryColor: string;
		neutralColor: string;
		accentColor: string;
		supportEmail: string;
		logoUrl: string;
	};

	const SECTIONS: Array<{ id: Section; label: string; icon: typeof Users }> = [
		{ id: "members", label: "Members", icon: Users },
		{ id: "teams", label: "Teams", icon: Buildings },
		{ id: "invites", label: "Invites", icon: Envelope },
		{ id: "branding", label: "Branding", icon: Palette },
		{ id: "domains", label: "Domains", icon: Globe },
		{ id: "roles", label: "Roles", icon: ShieldCheck },
	];

	let { data } = $props();

	let activeSection = $state<Section>("members");
	let busyAction = $state("");
	let inviteEmail = $state("");
	let inviteRole = $state("member");
	let newTeamName = $state("");
	let newHostname = $state("");
	let editingTeamId = $state("");
	let selectedMemberIds = $state<string[]>([]);
	let roleByMember = $state<Record<string, string>>({});
	let branding = $state<BrandingPayload>({
		senderName: "SleekSign",
		primaryColor: "#18181b",
		secondaryColor: "#f97316",
		neutralColor: "#f7f5f1",
		accentColor: "#ea580c",
		supportEmail: "",
		logoUrl: "",
	});

	const workspaceId = $derived(data.workspaceId || "");
	const teams = $derived((data.teams || []) as TeamPayload[]);
	const members = $derived((data.members || []) as MemberPayload[]);
	const invitations = $derived((data.invitations || []) as InvitationPayload[]);
	const roles = $derived((data.roles || []) as RolePayload[]);
	const domains = $derived((data.domains || []) as DomainPayload[]);
	const user = $derived(data.user);
	const loadError = $derived(data.error || null);

	$effect(() => {
		if (workspaceId) setCurrentWorkspaceId(workspaceId);
	});

	$effect(() => {
		if (data.branding) {
			branding = {
				senderName: data.branding.senderName,
				primaryColor: data.branding.primaryColor,
				secondaryColor: data.branding.secondaryColor,
				neutralColor: data.branding.neutralColor,
				accentColor: data.branding.accentColor,
				supportEmail: data.branding.supportEmail || "",
				logoUrl: data.branding.logoUrl || "",
			};
		}
	});

	function makeEnhance(action: string, onSuccess?: () => void): SubmitFunction {
		return () => {
			busyAction = action;
			return async ({ result, update }) => {
				busyAction = "";
				const actionResult = result as ActionResult;
				if (actionResult.type === "success") {
					onSuccess?.();
					toast.success(
						(actionResult.data as { message?: string } | undefined)?.message || "Saved",
					);
					await update();
					return;
				}
				if (actionResult.type === "failure") {
					toast.error(
						(actionResult.data as { error?: string } | undefined)?.error || "Request failed",
					);
				}
				await update({ reset: false });
			};
		};
	}

	function startEditTeam(team: TeamPayload) {
		editingTeamId = team.id;
		selectedMemberIds = [...(team.memberIds || [])];
	}

	function toggleMember(id: string) {
		selectedMemberIds = selectedMemberIds.includes(id)
			? selectedMemberIds.filter((entry) => entry !== id)
			: [...selectedMemberIds, id];
	}
</script>

<div class="min-h-0 flex-1 overflow-auto bg-background">
	<div class="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8">
		{#if loadError}
			<p class="mb-4 text-sm text-red-600">{loadError}</p>
		{/if}

		<section>
			<h1 class="text-xl font-semibold tracking-tight">Workspace settings</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{user?.email || "Manage members, teams, branding, and domains"}
			</p>
			<div class="mt-4 grid grid-cols-3 gap-3 text-center">
				<div class="rounded-lg bg-muted/40 px-3 py-2">
					<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Members</p>
					<p class="mt-1 text-lg font-medium tabular-nums">{members.length}</p>
				</div>
				<div class="rounded-lg bg-muted/40 px-3 py-2">
					<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Teams</p>
					<p class="mt-1 text-lg font-medium tabular-nums">{teams.length}</p>
				</div>
				<div class="rounded-lg bg-muted/40 px-3 py-2">
					<p class="text-[11px] uppercase tracking-wide text-muted-foreground">Invites</p>
					<p class="mt-1 text-lg font-medium tabular-nums">{invitations.length}</p>
				</div>
			</div>
		</section>

		<div class="mt-6 flex flex-wrap gap-1 rounded-[8px] bg-muted/40 p-1">
			{#each SECTIONS as section (section.id)}
				{@const Icon = section.icon}
				<button
					type="button"
					class={cn(
						"inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
						activeSection === section.id
							? "bg-background font-medium text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
					onclick={() => (activeSection = section.id)}
				>
					<Icon class="size-3.5" weight="fill" />
					{section.label}
				</button>
			{/each}
		</div>

		{#if !workspaceId}
			<p class="mt-8 text-sm text-muted-foreground">Select a workspace to manage settings.</p>
		{:else if activeSection === "members"}
			<section class="mt-6 overflow-hidden">
				<table class="w-full border-collapse">
					<thead>
						<tr class="h-9 border-b border-border bg-muted/40">
							<th class="px-4 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Member
							</th>
							<th class="px-4 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Role
							</th>
							<th class="px-4 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{#each members as member (member.id)}
							<tr class="border-b border-border/50 last:border-0">
								<td class="px-4 py-2.5">
									<p class="text-sm font-medium">{member.user?.name || member.user?.email}</p>
									<p class="text-xs text-muted-foreground">{member.user?.email}</p>
								</td>
								<td class="px-4 py-2.5">
									<span
										class="inline-flex rounded-[8px] bg-muted/50 px-2 py-0.5 text-[11px] font-medium capitalize"
									>
										{member.role}
									</span>
								</td>
								<td class="px-4 py-2.5 text-right">
									<form
										method="POST"
										action="?/removeMember"
										use:enhance={makeEnhance(`remove-${member.id}`)}
									>
										<input type="hidden" name="memberId" value={member.id} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											loading={busyAction === `remove-${member.id}`}
										>
											Remove
										</Button>
									</form>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="px-4 py-10 text-center text-sm text-muted-foreground">
									No members yet.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</section>
		{:else if activeSection === "teams"}
			<section class="mt-6 space-y-4">
				<form
					method="POST"
					action="?/createTeam"
					class="flex gap-2"
					use:enhance={makeEnhance("create-team", () => {
						newTeamName = "";
					})}
				>
					<Input name="name" bind:value={newTeamName} placeholder="Team name" required />
					<Button type="submit" loading={busyAction === "create-team"}>Create</Button>
				</form>

				<ul class="divide-y divide-border">
					{#each teams as team (team.id)}
						<li class="px-1 py-3">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm font-medium">
										{team.name}{team.isDefault ? " (default)" : ""}
									</p>
									<p class="text-xs text-muted-foreground">
										{(team.memberIds || []).length} members
									</p>
								</div>
								<div class="flex items-center gap-1">
									<Button variant="outline" size="sm" onclick={() => startEditTeam(team)}>
										Members
									</Button>
									{#if !team.isDefault}
										<form
											method="POST"
											action="?/deleteTeam"
											use:enhance={makeEnhance(`delete-team-${team.id}`)}
										>
											<input type="hidden" name="teamId" value={team.id} />
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												loading={busyAction === `delete-team-${team.id}`}
											>
												Delete
											</Button>
										</form>
									{/if}
								</div>
							</div>

							{#if editingTeamId === team.id}
								<form
									method="POST"
									action="?/saveTeamMembers"
									class="mt-3 space-y-3 rounded-lg bg-muted/20 p-3"
									use:enhance={makeEnhance(`save-members-${team.id}`, () => {
										editingTeamId = "";
									})}
								>
									<input type="hidden" name="teamId" value={team.id} />
									<div class="max-h-48 space-y-2 overflow-auto">
										{#each members as member (member.id)}
											<label class="flex items-center gap-2 text-sm">
												<input
													type="checkbox"
													name="memberIds"
													value={member.id}
													checked={selectedMemberIds.includes(member.id)}
													onchange={() => toggleMember(member.id)}
												/>
												<span>{member.user?.name || member.user?.email}</span>
											</label>
										{/each}
									</div>
									<div class="flex justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onclick={() => (editingTeamId = "")}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											size="sm"
											loading={busyAction === `save-members-${team.id}`}
										>
											Save members
										</Button>
									</div>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{:else if activeSection === "invites"}
			<section class="mt-6 space-y-6">
				<form
					method="POST"
					action="?/inviteMember"
					class="space-y-3"
					use:enhance={makeEnhance("invite", () => {
						inviteEmail = "";
						inviteRole = "member";
					})}
				>
					<h2 class="text-sm font-semibold">Invite member</h2>
					<Input
						name="email"
						bind:value={inviteEmail}
						placeholder="colleague@company.com"
						type="email"
						required
					/>
					<select
						name="role"
						class="h-8 w-full rounded-md border border-border px-2.5 text-xs"
						bind:value={inviteRole}
					>
						<option value="member">Member</option>
						<option value="admin">Admin</option>
					</select>
					<Button type="submit" loading={busyAction === "invite"}>Send invitation</Button>
				</form>

				<div class="overflow-hidden">
					<table class="w-full">
						<thead>
							<tr class="h-9 bg-muted/40">
								<th
									class="px-4 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
								>
									Email
								</th>
								<th
									class="px-4 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
								>
									Role
								</th>
								<th class="px-4"></th>
							</tr>
						</thead>
						<tbody>
							{#each invitations as invitation (invitation.id)}
								<tr class="border-t border-border/50">
									<td class="px-4 py-2.5 text-sm">{invitation.email}</td>
									<td class="px-4 py-2.5 text-sm capitalize">{invitation.role}</td>
									<td class="px-4 py-2.5 text-right">
										<form
											method="POST"
											action="?/cancelInvite"
											use:enhance={makeEnhance(`cancel-${invitation.id}`)}
										>
											<input type="hidden" name="invitationId" value={invitation.id} />
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												loading={busyAction === `cancel-${invitation.id}`}
											>
												Cancel
											</Button>
										</form>
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="3" class="px-4 py-10 text-center text-sm text-muted-foreground">
										No pending invitations.
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{:else if activeSection === "branding"}
			<form
				method="POST"
				action="?/saveBranding"
				class="mt-6 grid gap-4"
				use:enhance={makeEnhance("save-branding")}
			>
				<Input name="senderName" bind:value={branding.senderName} placeholder="Sender name" />
				<Input
					name="supportEmail"
					bind:value={branding.supportEmail}
					placeholder="Support email"
					type="email"
				/>
				<Input name="logoUrl" bind:value={branding.logoUrl} placeholder="Logo URL" />
				<input type="hidden" name="secondaryColor" value={branding.secondaryColor} />
				<input type="hidden" name="neutralColor" value={branding.neutralColor} />
				<div class="grid grid-cols-2 gap-3">
					<label class="text-xs text-muted-foreground">
						Primary
						<input
							type="color"
							name="primaryColor"
							bind:value={branding.primaryColor}
							class="mt-1 h-8 w-full"
						/>
					</label>
					<label class="text-xs text-muted-foreground">
						Accent
						<input
							type="color"
							name="accentColor"
							bind:value={branding.accentColor}
							class="mt-1 h-8 w-full"
						/>
					</label>
				</div>
				<Button type="submit" loading={busyAction === "save-branding"}>Save branding</Button>
			</form>
		{:else if activeSection === "domains"}
			<section class="mt-6 space-y-4">
				<form
					method="POST"
					action="?/requestDomain"
					class="flex gap-2"
					use:enhance={makeEnhance("request-domain", () => {
						newHostname = "";
					})}
				>
					<Input
						name="hostname"
						bind:value={newHostname}
						placeholder="sign.company.com"
						required
					/>
					<Button type="submit" loading={busyAction === "request-domain"}>Request</Button>
				</form>

				<ul class="divide-y divide-border">
					{#each domains as domain (domain.id)}
						<li class="space-y-3 px-1 py-3">
							<div class="flex items-center justify-between gap-3">
								<div>
									<p class="text-sm font-medium">{domain.hostname}</p>
									<p class="text-xs capitalize text-muted-foreground">{domain.status}</p>
								</div>
								{#if domain.status !== "verified" && domain.verificationToken}
									<form
										method="POST"
										action="?/verifyDomain"
										use:enhance={makeEnhance(`verify-${domain.id}`)}
									>
										<input type="hidden" name="domainId" value={domain.id} />
										<input
											type="hidden"
											name="verificationToken"
											value={domain.verificationToken}
										/>
										<Button
											type="submit"
											size="sm"
											loading={busyAction === `verify-${domain.id}`}
										>
											Verify
										</Button>
									</form>
								{/if}
							</div>
							{#if domain.verificationToken && domain.status !== "verified"}
								<p class="rounded-md bg-muted/50 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
									TXT token: {domain.verificationToken}
								</p>
							{/if}
						</li>
					{:else}
						<li class="px-1 py-10 text-center text-sm text-muted-foreground">
							No custom domains yet.
						</li>
					{/each}
				</ul>
			</section>
		{:else}
			<section class="mt-6 space-y-4">
				<p class="text-sm text-muted-foreground">
					Assign permission roles to workspace members.
				</p>
				{#if roles.length === 0}
					<div class="rounded-xl bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
						No custom roles configured for this workspace yet.
					</div>
				{:else}
					<ul class="space-y-3">
						{#each members as member (member.id)}
							<li class="rounded-xl bg-muted/20 p-4">
								<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<p class="text-sm font-medium">
											{member.user?.name || member.user?.email}
										</p>
										<p class="text-xs text-muted-foreground">
											{member.roleAssignments?.[0]?.role?.name || "No custom role"}
										</p>
									</div>
									<form
										method="POST"
										action="?/assignRole"
										class="flex items-center gap-2"
										use:enhance={makeEnhance(`assign-${member.id}`)}
									>
										<input type="hidden" name="memberId" value={member.id} />
										<select
											name="roleId"
											class="h-8 rounded-md border border-border px-2.5 text-xs"
											bind:value={roleByMember[member.id]}
											required
										>
											<option value="">Select role</option>
											{#each roles as role (role.id)}
												<option value={role.id}>{role.name}</option>
											{/each}
										</select>
										<Button
											type="submit"
											size="sm"
											loading={busyAction === `assign-${member.id}`}
										>
											Assign
										</Button>
									</form>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
	</div>
</div>
