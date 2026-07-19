<script lang="ts">
  import { enhance } from "$app/forms";
  import { toast } from "svelte-sonner";
  import Buildings from "phosphor-svelte/lib/Buildings";
  import Camera from "phosphor-svelte/lib/Camera";
  import CaretDown from "phosphor-svelte/lib/CaretDown";
  import CaretRight from "phosphor-svelte/lib/CaretRight";
  import Envelope from "phosphor-svelte/lib/Envelope";
  import Globe from "phosphor-svelte/lib/Globe";
  import Palette from "phosphor-svelte/lib/Palette";
  import ShieldCheck from "phosphor-svelte/lib/ShieldCheck";
  import UserCircle from "phosphor-svelte/lib/UserCircle";
  import Users from "phosphor-svelte/lib/Users";
  import Button from "$lib/components/ui/button.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import Sheet from "$lib/components/ui/sheet.svelte";
  import { cn } from "$lib/utils";
  import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";
  import type { ActionResult, SubmitFunction } from "@sveltejs/kit";

  type Section =
    | "profile"
    | "members"
    | "teams"
    | "invites"
    | "branding"
    | "domains";
  type TeamPayload = {
    id: string;
    name: string;
    isDefault?: boolean;
    memberIds?: string[];
  };
  type MemberPayload = {
    id: string;
    role: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
    teamIds?: string[];
  };
  type InvitationPayload = {
    id: string;
    email: string;
    role: string;
    status: string;
  };
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
    { id: "profile", label: "Profile", icon: UserCircle },
    { id: "members", label: "Members", icon: Users },
    { id: "teams", label: "Teams", icon: Buildings },
    { id: "invites", label: "Invites", icon: Envelope },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "domains", label: "Domains", icon: Globe },
  ];

  let { data } = $props();

  let activeSection = $state<Section>("profile");
  let busyAction = $state("");
  let profileName = $state("");
  let avatarPreview = $state("");
  let inviteEmail = $state("");
  let inviteRole = $state("member");
  let newTeamName = $state("");
  let newHostname = $state("");
  let openTeamId = $state("");
  let addMemberTeamId = $state("");
  let selectedMemberIds = $state<string[]>([]);
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
  const domains = $derived((data.domains || []) as DomainPayload[]);
  const user = $derived(data.user);
  const loadError = $derived(data.error || null);
  const permissions = $derived((data.permissions || []) as string[]);
  const membershipRole = $derived(String(data.membershipRole || ""));
  const hasPassword = $derived(Boolean(data.hasPassword));
  const canManageBranding = $derived(permissions.includes("branding:manage"));
  const canManageMembers = $derived(permissions.includes("members:manage"));
  const canManageTeams = $derived(permissions.includes("teams:manage"));
  const canChangeRoles = $derived(membershipRole === "owner");
  const addMemberTeam = $derived(
    teams.find((team) => team.id === addMemberTeamId) || null,
  );

  $effect(() => {
    if (workspaceId) setCurrentWorkspaceId(workspaceId);
  });

  $effect(() => {
    if (user?.name && !profileName) profileName = user.name;
  });

  function previewAvatar(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    avatarPreview = URL.createObjectURL(file);
  }

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
            (actionResult.data as { message?: string } | undefined)?.message ||
              "Saved",
          );
          await update();
          return;
        }
        if (actionResult.type === "failure") {
          toast.error(
            (actionResult.data as { error?: string } | undefined)?.error ||
              "Request failed",
          );
        }
        await update({ reset: false });
      };
    };
  }

  function toggleTeam(teamId: string) {
    openTeamId = openTeamId === teamId ? "" : teamId;
  }

  function openAddMemberSheet(team: TeamPayload) {
    addMemberTeamId = team.id;
    selectedMemberIds = [];
  }

  function closeAddMemberSheet() {
    addMemberTeamId = "";
    selectedMemberIds = [];
  }

  function toggleMember(id: string) {
    selectedMemberIds = selectedMemberIds.includes(id)
      ? selectedMemberIds.filter((entry) => entry !== id)
      : [...selectedMemberIds, id];
  }

  function memberTeamNames(member: MemberPayload) {
    return teams
      .filter((team) => member.teamIds?.includes(team.id))
      .map((team) => team.name);
  }

  function membersForTeam(team: TeamPayload) {
    const teamMemberIds = new Set(team.memberIds || []);
    return members.filter((member) => teamMemberIds.has(member.id));
  }
</script>

<div class="min-h-0 flex-1 overflow-auto bg-background">
  <div class="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
    {#if loadError}
      <p class="mb-4 text-sm text-red-600">{loadError}</p>
    {/if}

    <section>
      <h1 class="text-xl font-semibold tracking-tight">Workspace settings</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        {user?.email || "Manage members, teams, branding, and domains"}
      </p>
      <div class="mt-4 grid grid-cols-3 gap-3 text-center">
        <div
          class="rounded-lg border border-border bg-muted px-3 py-2 dark:bg-muted/70"
        >
          <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
            Members
          </p>
          <p class="mt-1 text-lg font-medium tabular-nums">{members.length}</p>
        </div>
        <div
          class="rounded-lg border border-border bg-muted px-3 py-2 dark:bg-muted/70"
        >
          <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
            Teams
          </p>
          <p class="mt-1 text-lg font-medium tabular-nums">{teams.length}</p>
        </div>
        <div
          class="rounded-lg border border-border bg-muted px-3 py-2 dark:bg-muted/70"
        >
          <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
            Invites
          </p>
          <p class="mt-1 text-lg font-medium tabular-nums">
            {invitations.length}
          </p>
        </div>
      </div>
    </section>

    <div
      class="mt-6 flex flex-wrap gap-1 rounded-[8px] border border-border bg-muted p-1 dark:bg-muted/70"
    >
      {#each SECTIONS as section (section.id)}
        {@const Icon = section.icon}
        <button
          type="button"
          class={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
            activeSection === section.id
              ? "bg-background font-semibold text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
          )}
          onclick={() => (activeSection = section.id)}
        >
          <Icon class="size-3.5" weight="fill" />
          {section.label}
        </button>
      {/each}
    </div>

    {#if activeSection === "profile"}
      <section class="mt-6 grid gap-8 lg:grid-cols-2">
        <div class="space-y-8">
          <form
            method="POST"
            action="?/updateAvatar"
            enctype="multipart/form-data"
            class="space-y-4"
            use:enhance={makeEnhance("update-avatar", () => {
              avatarPreview = "";
            })}
          >
            <div>
              <h2 class="text-sm font-semibold">Profile photo</h2>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                Use a JPG, PNG, or WebP image up to 5 MB.
              </p>
            </div>
            <div class="flex items-center gap-4">
              <div
                class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-semibold text-muted-foreground"
              >
                {#if avatarPreview || user?.image}
                  <img
                    src={avatarPreview || user.image}
                    alt=""
                    class="size-full object-cover"
                  />
                {:else}
                  {(user?.name || user?.email || "U")
                    .split(/\s+/)
                    .map((part: string) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                {/if}
              </div>
              <div class="flex items-center gap-2">
                <label
                  class="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <Camera class="size-4" aria-hidden="true" />
                  Choose image
                  <input
                    name="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="sr-only"
                    required
                    onchange={previewAvatar}
                  />
                </label>
                <Button
                  type="submit"
                  loading={busyAction === "update-avatar"}
                  disabled={!avatarPreview}
                >
                  Upload photo
                </Button>
              </div>
            </div>
          </form>

          <form
            method="POST"
            action="?/updateProfile"
            class="space-y-4"
            use:enhance={makeEnhance("update-profile")}
          >
            <div>
              <h2 class="text-sm font-semibold">Personal details</h2>
              <p class="text-xs leading-5 text-muted-foreground">
                This name appears across your workspaces and signing activity.
              </p>
            </div>
            <label class="block space-y-1.5 text-xs font-medium">
              Name
              <Input
                name="name"
                bind:value={profileName}
                minlength={2}
                maxlength={80}
                required
              />
            </label>
            <label class="block space-y-1.5 text-xs font-medium">
              Email
              <Input value={user?.email || ""} type="email" disabled />
            </label>
            <Button type="submit" loading={busyAction === "update-profile"}>
              Save profile
            </Button>
          </form>
        </div>

        <div>
          {#if hasPassword}
            <form
              method="POST"
              action="?/changePassword"
              class="space-y-4"
              use:enhance={makeEnhance("change-password", () => {
                const form = document.querySelector<HTMLFormElement>(
                  'form[action="?/changePassword"]',
                );
                form?.reset();
              })}
            >
              <div>
                <h2 class="text-sm font-semibold">Change password</h2>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                  Changing your password signs out your other active sessions.
                </p>
              </div>
              <Input
                name="currentPassword"
                type="password"
                placeholder="Current password"
                autocomplete="current-password"
                required
              />
              <Input
                name="newPassword"
                type="password"
                placeholder="New password"
                autocomplete="new-password"
                minlength={6}
                required
              />
              <Input
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                autocomplete="new-password"
                minlength={6}
                required
              />
              <Button type="submit" loading={busyAction === "change-password"}>
                Change password
              </Button>
            </form>
          {/if}
        </div>
      </section>
    {:else if !workspaceId}
      <p class="mt-8 text-sm text-muted-foreground">
        Select a workspace to manage settings.
      </p>
    {:else if activeSection === "members"}
      <section class="mt-6 space-y-5">
        <div class="border border-border bg-muted/20 p-4">
          <div class="flex items-start gap-3">
            <ShieldCheck class="mt-0.5 size-4 shrink-0" weight="fill" />
            <h2 class="text-sm font-semibold">Roles</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted-foreground">
            Every member has one role. These roles control access to SleekSign
            and are separate from signer labels such as Employee or Contractor
            inside a document.
          </p>

          <div class="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p class="text-xs font-medium">Owner</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                Full control, including billing, members, branding, and domains.
              </p>
            </div>
            <div>
              <p class="text-xs font-medium">Admin</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                Manages operations, members, teams, branding, and documents
                without billing access.
              </p>
            </div>
            <div>
              <p class="text-xs font-medium">Member</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                Creates, prepares, sends, and tracks documents within assigned
                teams.
              </p>
            </div>
          </div>
        </div>

        <div class="overflow-hidden">
          <table class="w-full table-fixed border-collapse">
            <thead>
              <tr class="h-9 border-b border-border bg-muted/40">
                <th
                  class="w-[32%] px-4 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Member
                </th>
                <th
                  class="w-[24%] px-4 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Teams
                </th>
                <th
                  class="w-[24%] px-4 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Role
                </th>
                <th
                  class="w-[20%] px-4 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {#each members as member (member.id)}
                {@const teamNames = memberTeamNames(member)}
                <tr class="border-b border-border/50 last:border-0">
                  <td class="min-w-0 px-4 py-3 align-top">
                    <p class="truncate text-sm font-medium">
                      {member.user?.name || member.user?.email}
                    </p>
                    <p class="truncate text-xs text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </td>
                  <td class="px-4 py-3 align-top">
                    <p class="truncate text-xs text-muted-foreground">
                      {teamNames.join(", ") || "No team"}
                    </p>
                  </td>
                  <td class="px-4 py-3 align-top">
                    {#if canChangeRoles && member.role !== "owner"}
                      <form
                        method="POST"
                        action="?/updateMemberRole"
                        class="flex items-center gap-2"
                        use:enhance={makeEnhance(`role-${member.id}`)}
                      >
                        <input
                          type="hidden"
                          name="memberId"
                          value={member.id}
                        />
                        <div class="relative min-w-0 flex-1">
                          <select
                            name="role"
                            class="h-8 w-full appearance-none rounded-md border border-border bg-background px-2.5 pr-8 text-xs capitalize outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                            aria-label={`Role for ${member.user?.name || member.user?.email || "member"}`}
                          >
                            <option
                              value="member"
                              selected={member.role === "member"}>Member</option
                            >
                            <option
                              value="admin"
                              selected={member.role === "admin"}>Admin</option
                            >
                          </select>
                          <CaretDown
                            class="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          loading={busyAction === `role-${member.id}`}
                        >
                          Save
                        </Button>
                      </form>
                    {:else}
                      <span
                        class="inline-flex rounded-[8px] bg-muted/50 px-2 py-0.5 text-[11px] font-medium capitalize"
                      >
                        {member.role}
                      </span>
                    {/if}
                  </td>
                  <td class="px-4 py-3 text-right align-top">
                    {#if canManageMembers && member.role !== "owner"}
                      <form
                        method="POST"
                        action="?/removeMember"
                        use:enhance={makeEnhance(`remove-${member.id}`)}
                      >
                        <input
                          type="hidden"
                          name="memberId"
                          value={member.id}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          loading={busyAction === `remove-${member.id}`}
                        >
                          Remove
                        </Button>
                      </form>
                    {:else}
                      <span class="text-xs text-muted-foreground">—</span>
                    {/if}
                  </td>
                </tr>
              {:else}
                <tr>
                  <td
                    colspan="4"
                    class="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No members yet.
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {:else if activeSection === "teams"}
      <section class="mt-6 space-y-4">
        {#if canManageTeams}
          <form
            method="POST"
            action="?/createTeam"
            class="flex gap-2"
            use:enhance={makeEnhance("create-team", () => {
              newTeamName = "";
            })}
          >
            <Input
              name="name"
              bind:value={newTeamName}
              placeholder="Team name"
              required
            />
            <Button type="submit" loading={busyAction === "create-team"}>
              Create
            </Button>
          </form>
        {/if}

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
                  <Button
                    variant="outline"
                    size="sm"
                    aria-expanded={openTeamId === team.id}
                    aria-controls={`team-members-${team.id}`}
                    onclick={() => toggleTeam(team.id)}
                  >
                    {#if openTeamId === team.id}
                      <CaretDown class="size-3.5" aria-hidden="true" />
                    {:else}
                      <CaretRight class="size-3.5" aria-hidden="true" />
                    {/if}
                    Members
                  </Button>
                  {#if canManageTeams && !team.isDefault}
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

              <div
                id={`team-members-${team.id}`}
                class="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
                class:grid-rows-[1fr]={openTeamId === team.id}
                class:grid-rows-[0fr]={openTeamId !== team.id}
              >
                <div class="min-h-0 overflow-hidden">
                  <div class="mt-3 border-t border-border/70 pt-3">
                    {#if canManageTeams}
                      <div class="mb-3 flex justify-end">
                        <Button
                          size="sm"
                          onclick={() => openAddMemberSheet(team)}
                        >
                          Add member
                        </Button>
                      </div>
                    {/if}

                    <div class="overflow-x-auto">
                      <table class="w-full min-w-[620px] border-collapse">
                        <thead>
                          <tr class="h-9 border-y border-border bg-muted/60">
                            <th
                              class="w-16 px-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                              >No.</th
                            >
                            <th
                              class="px-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                              >Team member</th
                            >
                            <th
                              class="w-52 px-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                              >Role</th
                            >
                            <th
                              class="w-28 px-3 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                              >Action</th
                            >
                          </tr>
                        </thead>
                        <tbody>
                          {#each membersForTeam(team) as member, index (member.id)}
                            <tr class="border-b border-border/60">
                              <td
                                class="px-3 py-3 text-xs tabular-nums text-muted-foreground"
                              >
                                {String(index + 1).padStart(2, "0")}
                              </td>
                              <td class="px-3 py-3">
                                <p class="text-sm font-medium">
                                  {member.user?.name || member.user?.email}
                                </p>
                                <p class="text-xs text-muted-foreground">
                                  {member.user?.email}
                                </p>
                              </td>
                              <td class="px-3 py-3">
                                {#if canChangeRoles && member.role !== "owner"}
                                  <form
                                    method="POST"
                                    action="?/updateMemberRole"
                                    use:enhance={makeEnhance(
                                      `team-role-${team.id}-${member.id}`,
                                    )}
                                  >
                                    <input
                                      type="hidden"
                                      name="memberId"
                                      value={member.id}
                                    />
                                    <div class="relative">
                                      <select
                                        name="role"
                                        class="h-8 w-full appearance-none rounded-md border border-border bg-background px-2.5 pr-8 text-xs capitalize outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label={`Role for ${member.user?.name || member.user?.email || "member"}`}
                                        onchange={(event) =>
                                          event.currentTarget.form?.requestSubmit()}
                                        disabled={busyAction ===
                                          `team-role-${team.id}-${member.id}`}
                                      >
                                        <option
                                          value="member"
                                          selected={member.role === "member"}
                                          >Member</option
                                        >
                                        <option
                                          value="admin"
                                          selected={member.role === "admin"}
                                          >Admin</option
                                        >
                                      </select>
                                      <CaretDown
                                        class="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                      />
                                    </div>
                                  </form>
                                {:else}
                                  <span class="text-xs capitalize"
                                    >{member.role}</span
                                  >
                                {/if}
                              </td>
                              <td class="px-3 py-3 text-right">
                                {#if canManageTeams}
                                  <form
                                    method="POST"
                                    action="?/removeTeamMember"
                                    use:enhance={makeEnhance(
                                      `remove-team-member-${team.id}-${member.id}`,
                                    )}
                                  >
                                    <input
                                      type="hidden"
                                      name="teamId"
                                      value={team.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="memberId"
                                      value={member.id}
                                    />
                                    <Button
                                      type="submit"
                                      variant="ghost"
                                      size="sm"
                                      loading={busyAction ===
                                        `remove-team-member-${team.id}-${member.id}`}
                                    >
                                      Remove
                                    </Button>
                                  </form>
                                {:else}
                                  <span class="text-xs text-muted-foreground"
                                    >—</span
                                  >
                                {/if}
                              </td>
                            </tr>
                          {:else}
                            <tr>
                              <td
                                colspan="4"
                                class="px-3 py-8 text-center text-sm text-muted-foreground"
                              >
                                No members in this team.
                              </td>
                            </tr>
                          {/each}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </section>

      <Sheet
        open={Boolean(addMemberTeamId)}
        onClose={closeAddMemberSheet}
        labelledBy="add-team-members-title"
        widthClass="w-[min(100vw,46rem)]"
      >
        <form
          method="POST"
          action="?/addTeamMembers"
          class="flex min-h-0 flex-1 flex-col"
          use:enhance={makeEnhance("add-team-members", closeAddMemberSheet)}
        >
          <input type="hidden" name="teamId" value={addMemberTeamId} />
          <div class="border-b border-border px-6 py-5">
            <h2 id="add-team-members-title" class="text-base font-semibold">
              Add members to {addMemberTeam?.name || "team"}
            </h2>
            <p class="mt-1 text-xs leading-5 text-muted-foreground">
              Select several workspace members at once. Roles apply across the
              whole workspace, not only this team.
            </p>
          </div>
          <div class="min-h-0 flex-1 overflow-auto px-6 py-4">
            <table class="w-full border-collapse">
              <thead>
                <tr class="h-9 border-y border-border bg-muted/60">
                  <th class="w-12 px-3 text-left">
                    <span class="sr-only">Select</span>
                  </th>
                  <th
                    class="px-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                    >Member</th
                  >
                  <th
                    class="w-44 px-3 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                    >Role</th
                  >
                </tr>
              </thead>
              <tbody>
                {#each members as member (member.id)}
                  {@const alreadyInTeam = addMemberTeam?.memberIds?.includes(
                    member.id,
                  )}
                  <tr
                    class="border-b border-border/60"
                    class:opacity-50={alreadyInTeam}
                  >
                    <td class="px-3 py-3">
                      <input
                        type="checkbox"
                        name="memberIds"
                        value={member.id}
                        checked={selectedMemberIds.includes(member.id)}
                        disabled={alreadyInTeam}
                        aria-label={`Select ${member.user?.name || member.user?.email || "member"}`}
                        onchange={() => toggleMember(member.id)}
                      />
                    </td>
                    <td class="px-3 py-3">
                      <p class="text-sm font-medium">
                        {member.user?.name || member.user?.email}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {alreadyInTeam ? "Already in team" : member.user?.email}
                      </p>
                    </td>
                    <td class="px-3 py-3">
                      {#if canChangeRoles && member.role !== "owner" && !alreadyInTeam}
                        <div class="relative">
                          <select
                            name={`role:${member.id}`}
                            class="h-8 w-full appearance-none rounded-md border border-border bg-background px-2.5 pr-8 text-xs capitalize outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                            aria-label={`Role for ${member.user?.name || member.user?.email || "member"}`}
                          >
                            <option
                              value="member"
                              selected={member.role === "member"}>Member</option
                            >
                            <option
                              value="admin"
                              selected={member.role === "admin"}>Admin</option
                            >
                          </select>
                          <CaretDown
                            class="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      {:else}
                        <span class="text-xs capitalize">{member.role}</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <div
            class="flex items-center justify-between border-t border-border px-6 py-4"
          >
            <p class="text-xs text-muted-foreground">
              {selectedMemberIds.length} selected
            </p>
            <Button
              type="submit"
              disabled={!selectedMemberIds.length}
              loading={busyAction === "add-team-members"}
            >
              Add selected
            </Button>
          </div>
        </form>
      </Sheet>
    {:else if activeSection === "invites"}
      <section class="mt-6 space-y-6">
        {#if canManageMembers}
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
            <div class="flex flex-col items-center gap-2 sm:flex-row">
              <Input
                name="email"
                bind:value={inviteEmail}
                placeholder="colleague@company.com"
                type="email"
                aria-label="Email address"
                required
              />
              <div class="relative w-full sm:w-28">
                <select
                  name="role"
                  class="h-8 w-full appearance-none rounded-md border border-border bg-background px-2.5 pr-8 text-xs outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  bind:value={inviteRole}
                  aria-label="Role"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <CaretDown
                  class="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <Button
                type="submit"
                class="w-full sm:w-40"
                loading={busyAction === "invite"}>Send invitation</Button
              >
            </div>
          </form>
        {:else}
          <p class="text-xs text-muted-foreground">
            Only Owners and Admins can invite members.
          </p>
        {/if}

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
                  <td class="px-4 py-2.5 text-sm capitalize"
                    >{invitation.role}</td
                  >
                  <td class="px-4 py-2.5 text-right">
                    {#if canManageMembers}
                      <form
                        method="POST"
                        action="?/cancelInvite"
                        use:enhance={makeEnhance(`cancel-${invitation.id}`)}
                      >
                        <input
                          type="hidden"
                          name="invitationId"
                          value={invitation.id}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          loading={busyAction === `cancel-${invitation.id}`}
                        >
                          Cancel
                        </Button>
                      </form>
                    {/if}
                  </td>
                </tr>
              {:else}
                <tr>
                  <td
                    colspan="3"
                    class="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
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
        <Input
          name="senderName"
          bind:value={branding.senderName}
          placeholder="Sender name"
        />
        <Input
          name="supportEmail"
          bind:value={branding.supportEmail}
          placeholder="Support email"
          type="email"
        />
        <Input
          name="logoUrl"
          bind:value={branding.logoUrl}
          placeholder="Logo URL"
        />
        <input
          type="hidden"
          name="secondaryColor"
          value={branding.secondaryColor}
        />
        <input
          type="hidden"
          name="neutralColor"
          value={branding.neutralColor}
        />
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
        <Button type="submit" loading={busyAction === "save-branding"}
          >Save branding</Button
        >
      </form>
    {:else if activeSection === "domains"}
      <section class="mt-6 space-y-4">
        <div class="border border-border bg-muted/20 p-4">
          <div class="flex items-start gap-3">
            <Globe class="mt-0.5 size-4 shrink-0" weight="fill" />
            <div>
              <h2 class="text-sm font-semibold">How custom domains work</h2>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                The person who controls the domain's DNS adds the TXT record
                shown below. An Owner or Admin then asks SleekSign to check DNS.
                SleekSign's server verifies the record; the SleekSign owner does
                not approve domains manually.
              </p>
              <p class="mt-2 text-xs leading-5 text-muted-foreground">
                DNS ownership verification does not route traffic by itself. The
                hostname must also be attached to the SleekSign Vercel project
                and use the A or CNAME record Vercel provides before links and
                TLS work.
              </p>
            </div>
          </div>
        </div>

        {#if canManageBranding}
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
              aria-label="Custom domain hostname"
              required
            />
            <Button
              type="submit"
              class="w-full sm:w-40"
              loading={busyAction === "request-domain"}>Request domain</Button
            >
          </form>
        {:else}
          <p class="text-xs text-muted-foreground">
            You can view domain status, but only members with branding
            management access can add a domain or run the DNS check.
          </p>
        {/if}

        <ul class="divide-y divide-border">
          {#each domains as domain (domain.id)}
            <li class="space-y-3 px-1 py-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium">{domain.hostname}</p>
                  <p class="text-xs capitalize text-muted-foreground">
                    {domain.status}
                  </p>
                </div>
                {#if canManageBranding && domain.status !== "verified" && domain.verificationToken}
                  <form
                    method="POST"
                    action="?/verifyDomain"
                    use:enhance={makeEnhance(`verify-${domain.id}`)}
                  >
                    <input type="hidden" name="domainId" value={domain.id} />
                    <Button
                      type="submit"
                      size="sm"
                      loading={busyAction === `verify-${domain.id}`}
                    >
                      Check DNS
                    </Button>
                  </form>
                {/if}
              </div>
              {#if domain.verificationToken && domain.status !== "verified"}
                <dl
                  class="grid gap-2 bg-muted/40 px-3 py-2.5 text-[11px] sm:grid-cols-2"
                >
                  <div>
                    <dt class="text-muted-foreground">TXT name</dt>
                    <dd class="mt-1 break-all font-mono text-foreground">
                      _sleeksign.{domain.hostname}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-muted-foreground">TXT value</dt>
                    <dd class="mt-1 break-all font-mono text-foreground">
                      {domain.verificationToken}
                    </dd>
                  </div>
                </dl>
              {/if}
            </li>
          {:else}
            <li class="px-1 py-10 text-center text-sm text-muted-foreground">
              No custom domains yet.
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</div>
