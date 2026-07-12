<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import Button from "$lib/components/ui/button.svelte";
	import { authClient, saveLastWorkspaceId } from "$lib/auth-client";
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
		if (authOrganizations === null) return;
		if (handledAutoSelection) return;

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
				await goto(resolve("/accept-invitation/[id]", { id }), { replaceState: true });
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
				await goto(resolve("/accept-invitation/[id]", { id }), { replaceState: true });
				return;
			}
		}

		await goto(resolve("/docs"), { replaceState: true });
	}
</script>

<main class="flex min-h-svh items-center justify-center bg-(--paper) px-4 py-8">
	{#if dialogOpen}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-[2px]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="workspace-dialog-title"
		>
			<div class="w-full max-w-lg border border-border bg-popover">
				<div class="border-b border-border px-5 py-4">
					<p
						class="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
					>
						Workspace Access
					</p>
					<h2 id="workspace-dialog-title" class="mt-2 text-base font-medium">
						Choose the workspace you want to open
					</h2>
					<p class="mt-2 text-sm text-muted-foreground">
						We'll remember this workspace and log you into it automatically the
						next time you sign in.
					</p>
				</div>

				<div class="space-y-3 px-5 py-4">
					{#if workspaces.length === 0}
						<div class="border border-dashed border-border bg-background p-4">
							<div class="mb-2 flex items-center gap-1">
								<svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path d="M3 21V9l9-6 9 6v12H3zm2-2h14V10.2l-7-4.67-7 4.67V19zm4-2h6v-6H9v6z" />
								</svg>
								<p class="text-sm font-medium text-foreground">No workspaces yet</p>
							</div>
							<p class="text-xs text-muted-foreground">
								Your account signed in successfully. Continue to your dashboard and
								create a workspace from the account menu.
							</p>

							<Button
								class="mt-3 w-full gap-2"
								onclick={continueWithoutWorkspace}
								disabled={isContinuingWithoutWorkspace}
								loading={isContinuingWithoutWorkspace}
							>
								Continue
								<svg class="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
									<path d="M13 5l7 7-7 7v-4H4v-6h9V5z" />
								</svg>
							</Button>
						</div>
					{:else}
						{#each workspaces as workspace (workspace.id)}
							<button
								type="button"
								onclick={() => selectWorkspace(workspace.id, true)}
								disabled={busyWorkspaceId === workspace.id}
								class="flex w-full items-center justify-between gap-3 border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60"
							>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium text-foreground">
										{workspace.name}
									</p>
									<p
										class="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
									>
										{workspace.slug}
									</p>
								</div>

								{#if busyWorkspaceId === workspace.id}
									<svg
										class="size-4 animate-spin text-foreground"
										viewBox="0 0 24 24"
										fill="none"
										aria-hidden="true"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										/>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										/>
									</svg>
								{:else}
									<svg
										class="size-4 text-muted-foreground"
										viewBox="0 0 24 24"
										fill="currentColor"
										aria-hidden="true"
									>
										<path d="M13 5l7 7-7 7v-4H4v-6h9V5z" />
									</svg>
								{/if}
							</button>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-3 text-sm text-muted-foreground">
			<svg
				class="size-4 animate-spin text-foreground"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				/>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				/>
			</svg>
			Preparing your workspace access...
		</div>
	{/if}
</main>
