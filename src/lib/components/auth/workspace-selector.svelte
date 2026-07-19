<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { authClient, saveLastWorkspaceId } from "$lib/auth-client";
  import DashboardHome from "$lib/components/docs/dashboard-home.svelte";
  import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";
  import { getLastWorkspaceId } from "./auth-utils";

  let { nextPath }: { nextPath?: string } = $props();

  onMount(() => {
    document.body.classList.add("auth-page");
    return () => document.body.classList.remove("auth-page");
  });

  const sessionStore = authClient.useSession();
  const organizationsStore = authClient.useListOrganizations();

  let busyWorkspaceId = $state("");
  let isContinuingWithoutWorkspace = $state(false);
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

  async function continueWithoutWorkspace() {
    isContinuingWithoutWorkspace = true;
    await saveLastWorkspaceId(null);

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
</script>

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
      isContinuingWithoutWorkspace,
      onSelectWorkspace: (workspaceId) =>
        selectWorkspace(workspaceId, true),
      onContinueWithoutWorkspace: continueWithoutWorkspace,
    }}
  />
</div>
