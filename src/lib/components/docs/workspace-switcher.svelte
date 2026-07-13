<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import Button from "$lib/components/ui/button.svelte";
  import Dialog from "$lib/components/ui/dialog.svelte";
  import DialogContent from "$lib/components/ui/dialog-content.svelte";
  import DialogDescription from "$lib/components/ui/dialog-description.svelte";
  import DialogFooter from "$lib/components/ui/dialog-footer.svelte";
  import DialogHeader from "$lib/components/ui/dialog-header.svelte";
  import DialogTitle from "$lib/components/ui/dialog-title.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import { postFormAction } from "$lib/form-action";
  import type { TeamSummary, WorkspaceSummary } from "$lib/server/workspace";
  import { cn } from "$lib/utils";
  import {
    setCurrentTeamId,
    setCurrentWorkspaceId,
    workspaceStore,
  } from "$lib/workspace-store.svelte";
  import { CaretDownIcon, ChairIcon, CommandIcon } from "phosphor-svelte";

  let {
    workspaceId,
    workspaces,
    teams,
    teamsByWorkspace = {},
  }: {
    workspaceId: string;
    workspaces: WorkspaceSummary[];
    teams: TeamSummary[];
    teamsByWorkspace?: Record<string, TeamSummary[]>;
  } = $props();

  let open = $state(false);
  let viewedWorkspaceId = $state("");
  let createWorkspaceOpen = $state(false);
  let createTeamOpen = $state(false);
  let newWorkspaceName = $state("");
  let newTeamName = $state("");
  let workspaceBusy = $state(false);
  let teamBusy = $state(false);
  let panelRef = $state<HTMLDivElement | null>(null);

  const selectedWorkspaceId = $derived(
    workspaceId || workspaceStore.workspaceId,
  );
  const selectedTeamId = $derived(workspaceStore.teamId);
  const viewedId = $derived(
    viewedWorkspaceId || selectedWorkspaceId || workspaces[0]?.id || "",
  );
  const activeWorkspace = $derived(
    workspaces.find((item) => item.id === selectedWorkspaceId) || null,
  );
  const viewedWorkspace = $derived(
    workspaces.find((item) => item.id === viewedId) || null,
  );
  const viewedTeams = $derived(
    teamsByWorkspace[viewedId] ||
      (viewedId === selectedWorkspaceId ? teams : []),
  );

  $effect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!panelRef?.contains(event.target as Node)) {
        open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  });

  async function switchWorkspace(nextWorkspaceId: string, nextTeamId?: string) {
    try {
      const result = await postFormAction<{
        workspaceId?: string;
        teamId?: string;
      }>("switchWorkspace", {
        workspaceId: nextWorkspaceId,
        teamId: nextTeamId || "",
      });

      const resolvedTeamId =
        result.teamId ||
        nextTeamId ||
        (teamsByWorkspace[nextWorkspaceId] || []).find((team) => team.isDefault)
          ?.id ||
        (teamsByWorkspace[nextWorkspaceId] || [])[0]?.id ||
        "";

      setCurrentWorkspaceId(nextWorkspaceId);
      setCurrentTeamId(resolvedTeamId);
      open = false;
      await invalidateAll();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to switch workspace",
      );
    }
  }

  async function createWorkspace(event: SubmitEvent) {
    event.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;

    try {
      workspaceBusy = true;
      const result = await postFormAction<{ workspaceId?: string }>(
        "createWorkspace",
        {
          name,
        },
      );
      if (result.workspaceId) {
        setCurrentWorkspaceId(result.workspaceId);
        setCurrentTeamId("");
      }
      toast.success("Workspace created");
      createWorkspaceOpen = false;
      newWorkspaceName = "";
      await invalidateAll();
    } catch {
      toast.error("Unable to create workspace");
    } finally {
      workspaceBusy = false;
    }
  }

  async function createTeam(event: SubmitEvent) {
    event.preventDefault();
    const name = newTeamName.trim();
    if (!viewedId || !name) return;

    try {
      teamBusy = true;
      if (viewedId !== selectedWorkspaceId) {
        await switchWorkspace(viewedId);
      }
      const result = await postFormAction<{ teamId?: string }>("createTeam", {
        name,
      });
      toast.success("Team created");
      createTeamOpen = false;
      newTeamName = "";
      if (result.teamId) setCurrentTeamId(result.teamId);
      await invalidateAll();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create team",
      );
    } finally {
      teamBusy = false;
    }
  }
</script>

<div bind:this={panelRef} class="relative">
  <button
    type="button"
    class="flex items-center gap-2 rounded-md px-2 text-xs text-foreground transition-colors"
    aria-expanded={open}
    onclick={() => {
      open = !open;
      if (open) {
        viewedWorkspaceId = selectedWorkspaceId || workspaces[0]?.id || "";
      }
    }}
  >
    <span class="max-w-[140px] truncate"
      >{activeWorkspace?.name || "Workspace"}</span
    >
    <CaretDownIcon class="size-4 text-muted-foreground" />
  </button>

  {#if open}
    <div
      class="absolute left-0 top-[calc(100%+0.5rem)] z-50 flex h-58 w-[min(92vw,28rem)] overflow-hidden rounded-lg border border-border bg-popover"
    >
      <div class="flex min-h-0 min-w-0 flex-1 flex-col border-r border-border">
        <div class="shrink-0 border-b border-border px-3 py-2">
          <p class="text-[11px] font-medium text-muted-foreground">
            Workspaces
          </p>
        </div>
        <div class="min-h-0 flex-1 overflow-auto py-1">
          {#each workspaces as workspace (workspace.id)}
            <button
              type="button"
              class={cn(
                "flex h-9 w-full items-center gap-2 px-3 text-left text-xs transition-colors hover:bg-muted",
                viewedId === workspace.id
                  ? "bg-muted/60 text-foreground"
                  : "text-muted-foreground",
              )}
              onclick={() => (viewedWorkspaceId = workspace.id)}
            >
              <svg
                class="size-3.5 shrink-0"
                viewBox="0 0 256 256"
                fill="currentColor"
              >
                <path
                  d="M208,32H184V24a8,8,0,0,0-8-8H80a8,8,0,0,0-8,8v8H48A16,16,0,0,0,32,48V80a16,16,0,0,0,16,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V96h8a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM88,24h80v8H88ZM192,208H64V96H192Zm16-128H48V48H208Z"
                />
              </svg>
              <span class="min-w-0 flex-1 truncate">{workspace.name}</span>
              {#if selectedWorkspaceId === workspace.id}
                <svg
                  class="size-3.5 shrink-0 text-emerald-600"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                >
                  <path
                    d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
                  />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
        <div
          class="mt-auto flex h-11 shrink-0 items-center border-t border-border px-2"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-8 w-full justify-start gap-2 text-xs"
            onclick={() => {
              open = false;
              createWorkspaceOpen = true;
            }}
          >
            <svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
              <path
                d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
              />
            </svg>
            Create workspace
          </Button>
        </div>
      </div>

      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <div class="shrink-0 border-b border-border px-3 py-2">
          <p class="truncate text-[11px] font-medium text-muted-foreground">
            {viewedWorkspace?.name || "Teams"}
          </p>
        </div>
        <div class="min-h-0 flex-1 overflow-auto py-1">
          {#if viewedTeams.length === 0}
            <p class="px-3 py-4 text-xs text-muted-foreground">
              No teams yet.
            </p>
          {:else}
            {#each viewedTeams as team (team.id)}
              <button
                type="button"
                class="flex h-9 w-full items-center gap-2 px-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onclick={() => switchWorkspace(viewedId, team.id)}
              >
                <svg
                  class="size-3.5 shrink-0"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                >
                  <path
                    d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-14.85-85.53,8,8,0,1,1-5.39-15.07,60,60,0,0,1,55.38,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z"
                  />
                </svg>
                <span class="min-w-0 flex-1 truncate">{team.name}</span>
                {#if selectedWorkspaceId === viewedId && selectedTeamId === team.id}
                  <svg
                    class="size-3.5 shrink-0 text-emerald-600"
                    viewBox="0 0 256 256"
                    fill="currentColor"
                  >
                    <path
                      d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
                    />
                  </svg>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
        <div
          class="mt-auto flex h-11 shrink-0 items-center border-t border-border px-2"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-8 w-full justify-start gap-2 text-xs"
            disabled={!viewedId}
            onclick={() => {
              open = false;
              createTeamOpen = true;
            }}
          >
            <svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
              <path
                d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
              />
            </svg>
            Create team
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>

<Dialog bind:open={createWorkspaceOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create workspace</DialogTitle>
      <DialogDescription
        >Start a new workspace with a default team.</DialogDescription
      >
    </DialogHeader>
    <form class="grid gap-4" onsubmit={createWorkspace}>
      <Input
        bind:value={newWorkspaceName}
        placeholder="Workspace name"
        class="h-9 text-xs"
      />
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onclick={() => (createWorkspaceOpen = false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={workspaceBusy}>
          {workspaceBusy ? "Creating..." : "Create"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

<Dialog bind:open={createTeamOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create team</DialogTitle>
      <DialogDescription>
        Add a team inside {viewedWorkspace?.name || "this workspace"}.
      </DialogDescription>
    </DialogHeader>
    <form class="grid gap-4" onsubmit={createTeam}>
      <Input
        bind:value={newTeamName}
        placeholder="Team name"
        class="h-9 text-xs"
      />
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onclick={() => (createTeamOpen = false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={teamBusy}
          >{teamBusy ? "Creating..." : "Create"}</Button
        >
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
