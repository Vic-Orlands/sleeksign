<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { authClient, saveLastWorkspaceId } from "$lib/auth-client";
  import Button from "$lib/components/ui/button.svelte";
  import DashboardHome from "$lib/components/docs/dashboard-home.svelte";
  import Input from "$lib/components/ui/input.svelte";
  import { postFormAction } from "$lib/form-action";
  import {
    setCurrentTeamId,
    setCurrentWorkspaceId,
  } from "$lib/workspace-store.svelte";
  import { getLastWorkspaceId } from "./auth-utils";

  let { nextPath }: { nextPath?: string } = $props();

  onMount(() => {
    document.body.classList.add("auth-page");
    return () => document.body.classList.remove("auth-page");
  });

  const sessionStore = authClient.useSession();
  const organizationsStore = authClient.useListOrganizations();

  let busyWorkspaceId = $state("");
  let workspaceName = $state("");
  let workspaceBusy = $state(false);
  let workspaceError = $state("");
  let handledAutoSelection = $state(false);

  const session = $derived($sessionStore.data);
  const authOrganizations = $derived($organizationsStore.data);
  const sessionPending = $derived($sessionStore.isPending);
  const workspaces = $derived(
    Array.isArray(authOrganizations) ? authOrganizations : [],
  );
  const lastWorkspaceId = $derived(getLastWorkspaceId(session?.user));
  const preferredWorkspace = $derived(
    workspaces.find((workspace) => workspace.id === lastWorkspaceId) || null,
  );
  const dialogOpen = $derived(
    Boolean(session && authOrganizations !== null && !preferredWorkspace),
  );

  $effect(() => {
    if (sessionPending) return;
    if (!session) {
      const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
      goto(`${resolve("/signin")}${query}`, { replaceState: true });
      return;
    }
    if (authOrganizations === null || handledAutoSelection) return;

    if (
      workspaces.length === 0 &&
      nextPath?.startsWith("/accept-invitation/")
    ) {
      handledAutoSelection = true;
      const id = nextPath.split("/").pop();
      if (id) {
        void goto(resolve("/accept-invitation/[id]", { id }), {
          replaceState: true,
        });
      }
      return;
    }

    if (preferredWorkspace) {
      handledAutoSelection = true;
      void selectWorkspace(preferredWorkspace.id, false);
    }
  });

  async function selectWorkspace(
    workspaceId: string,
    shouldPersistSelection: boolean,
  ) {
    busyWorkspaceId = workspaceId;
    setCurrentWorkspaceId(workspaceId);
    await authClient.$fetch("/organization/set-active", {
      method: "POST",
      body: { organizationId: workspaceId },
    });
    if (shouldPersistSelection || workspaceId !== lastWorkspaceId) {
      await saveLastWorkspaceId(workspaceId);
    }
    if (nextPath?.startsWith("/accept-invitation/")) {
      const id = nextPath.split("/").pop();
      if (id) {
        await goto(resolve("/accept-invitation/[id]", { id }), {
          replaceState: true,
        });
        return;
      }
    }

    await goto(resolve("/docs"), { replaceState: true });
  }

  async function createWorkspace(event: SubmitEvent) {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name || workspaceBusy) return;

    workspaceBusy = true;
    workspaceError = "";
    try {
      const result = await postFormAction<{
        workspaceId?: string;
        defaultTeamId?: string;
      }>("createWorkspace", { name });

      if (!result.workspaceId) {
        throw new Error("Workspace creation did not return an ID");
      }

      setCurrentWorkspaceId(result.workspaceId);
      setCurrentTeamId(result.defaultTeamId || "");
      await saveLastWorkspaceId(result.workspaceId);
      await goto(resolve("/docs"), { replaceState: true });
    } catch (error) {
      workspaceError =
        error instanceof Error ? error.message : "Unable to create workspace";
    } finally {
      workspaceBusy = false;
    }
  }
</script>

{#if session && authOrganizations !== null && workspaces.length === 0}
  <main
    class="grid min-h-svh place-items-center bg-(--paper) px-4 py-10 text-foreground"
  >
    <section class="w-full max-w-sm overflow-hidden rounded-xl bg-background">
      <div class="border-b border-border mx-6 py-5 sm:mx-7">
        <a href={resolve("/")} class="font-cursive text-2xl">SleekSign</a>
        <h1 class="mt-3 text-2xl font-semibold tracking-tight">
          Give your documents a home
        </h1>
        <p class="mt-2 text-sm leading-5 text-muted-foreground">
          Create the workspace where your team will prepare, send, and track
          documents.
        </p>
      </div>

      <form class="space-y-5 px-6 py-6 sm:px-7" onsubmit={createWorkspace}>
        <label class="grid gap-1.5">
          <span
            class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Workspace name
          </span>
          <Input
            name="name"
            autocomplete="organization"
            placeholder="Acme Legal"
            bind:value={workspaceName}
            required
            autofocus
          />
        </label>

        <div
          class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-border bg-muted/35 px-4 py-3"
        >
          <div class="min-w-0">
            <p
              class="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Workspace
            </p>
            <p class="mt-1 truncate text-sm font-medium">
              {workspaceName.trim() || "Your workspace"}
            </p>
          </div>
          <svg
            class="size-4 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="M5 12h14M15 8l4 4-4 4" />
          </svg>
          <div class="min-w-0">
            <p
              class="font-mono text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Default team
            </p>
            <p class="mt-1 text-sm font-medium">General</p>
          </div>
        </div>

        <p class="text-xs leading-5 text-muted-foreground">
          You’ll be added as the workspace owner and as a member of the General
          team.
        </p>

        {#if workspaceError}
          <p
            class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {workspaceError}
          </p>
        {/if}

        <Button
          class="w-full"
          type="submit"
          loading={workspaceBusy}
          loadingText="Creating workspace..."
        >
          Create workspace
        </Button>
      </form>
    </section>
  </main>
{:else}
  <div class="h-svh bg-background">
    <DashboardHome
      filteredDocuments={[]}
      tableFilter="all"
      onFilterChange={() => undefined}
      onUpload={() => undefined}
      workspaceId={null}
      isInitialLoading={false}
      onSelectDocument={() => undefined}
      workspaceAccess={{
        state: dialogOpen ? "choose" : "loading",
        workspaces,
        busyWorkspaceId,
        isContinuingWithoutWorkspace: false,
        onSelectWorkspace: (workspaceId) => selectWorkspace(workspaceId, true),
        onContinueWithoutWorkspace: () => undefined,
      }}
    />
  </div>
{/if}
