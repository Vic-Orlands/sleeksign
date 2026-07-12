<script lang="ts">
	import { enhance } from "$app/forms";
	import { format } from "date-fns";
	import { toast } from "svelte-sonner";
	import { MagnifyingGlassIcon } from "phosphor-svelte";
	import StatusBadge from "$lib/components/docs/status-badge.svelte";
	import type { DocumentRecord, SessionRecord } from "$lib/components/docs/types";
	import Button from "$lib/components/ui/button.svelte";
	import Dialog from "$lib/components/ui/dialog.svelte";
	import DialogContent from "$lib/components/ui/dialog-content.svelte";
	import DialogDescription from "$lib/components/ui/dialog-description.svelte";
	import DialogFooter from "$lib/components/ui/dialog-footer.svelte";
	import DialogHeader from "$lib/components/ui/dialog-header.svelte";
	import DialogTitle from "$lib/components/ui/dialog-title.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";
	import type { ActionResult, SubmitFunction } from "@sveltejs/kit";

	type SignedSession = SessionRecord & { documentName: string };
	type SignedSessionGroup = {
		documentId: string;
		documentName: string;
		sessions: SignedSession[];
	};

	let { data } = $props();

	let query = $state("");
	let selectedGroup = $state<SignedSessionGroup | null>(null);
	let groupQuery = $state("");
	let sessionToDelete = $state<SignedSession | null>(null);
	let isDeletingSession = $state(false);

	const workspaceId = $derived(data.workspaceId || "");
	const documents = $derived((data.documents || []) as DocumentRecord[]);
	const loadError = $derived(data.error || null);

	const signedSessions = $derived(
		documents.flatMap((document) =>
			(document.sessions || [])
				.filter(
					(session) =>
						session.status === "completed" &&
						(Boolean(session.finalizedFileUrl) || !session.id.startsWith("packet-")),
				)
				.map((session) => ({
					...session,
					documentName: document.name,
				})),
		),
	);

	const filteredSessions = $derived(
		signedSessions.filter((session) => {
			const needle = query.trim().toLowerCase();
			if (!needle) return true;
			return [session.documentName, session.signerName, session.signerEmail]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(needle));
		}),
	);

	const sessionGroups = $derived.by(() => {
		const groups = new Map<string, SignedSession[]>();

		for (const session of filteredSessions) {
			groups.set(session.documentId, [...(groups.get(session.documentId) || []), session]);
		}

		return Array.from(groups.entries())
			.map(([documentId, sessions]) => ({
				documentId,
				documentName: sessions[0]?.documentName || "Signed document",
				sessions: [...sessions].sort(
					(a, b) =>
						new Date(b.completedAt || b.createdAt).getTime() -
						new Date(a.completedAt || a.createdAt).getTime(),
				),
			}))
			.sort(
				(a, b) =>
					new Date(b.sessions[0]?.completedAt || b.sessions[0]?.createdAt || 0).getTime() -
					new Date(a.sessions[0]?.completedAt || a.sessions[0]?.createdAt || 0).getTime(),
			);
	});

	const selectedGroupSessions = $derived(
		(selectedGroup?.sessions || []).filter((session) => {
			const needle = groupQuery.trim().toLowerCase();
			if (!needle) return true;
			return [session.signerName, session.signerEmail]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(needle));
		}),
	);

	$effect(() => {
		if (workspaceId) setCurrentWorkspaceId(workspaceId);
	});

	function formatCompletedAt(session: SignedSession) {
		const value = session.completedAt || session.createdAt;
		return format(new Date(value), "MMM d, yyyy");
	}

	const deleteEnhance: SubmitFunction = () => {
		isDeletingSession = true;
		return async ({ result, update }) => {
			isDeletingSession = false;
			const actionResult = result as ActionResult;
			if (actionResult.type === "success") {
				const deletedId = sessionToDelete?.id;
				sessionToDelete = null;
				if (selectedGroup && deletedId) {
					selectedGroup = {
						...selectedGroup,
						sessions: selectedGroup.sessions.filter((session) => session.id !== deletedId),
					};
				}
				toast.success("Signed copy deleted");
				await update();
				return;
			}
			if (actionResult.type === "failure") {
				toast.error(
					(actionResult.data as { error?: string } | undefined)?.error ||
						"Failed to delete signed copy",
				);
			}
			await update({ reset: false });
		};
	};
</script>

{#if loadError}
	<div class="flex h-full items-center justify-center p-8 text-sm text-red-600">
		{loadError}
	</div>
{:else}
	<main class="flex h-full min-h-0 flex-col overflow-hidden bg-background">
		<section class="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col py-8">
			<div class="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex min-w-0 items-center gap-3">
					<h1 class="shrink-0 text-xl font-semibold text-foreground">Signed docs</h1>
					<div class="relative w-62">
						<MagnifyingGlassIcon
							class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							value={query}
							oninput={(event) => (query = (event.currentTarget as HTMLInputElement).value)}
							placeholder="Search signed docs..."
							class="h-7 rounded-[8px] border-border bg-background pl-8 text-xs"
						/>
					</div>
				</div>
				<p class="text-[12px] text-muted-foreground">
					{filteredSessions.length} of {signedSessions.length} completed sessions
				</p>
			</div>

			<div class="mt-5 min-h-0 flex-1 overflow-auto bg-background">
				<table class="w-full min-w-[720px] border-collapse table-auto md:table-fixed">
					<colgroup>
						<col style="width: 24rem" />
						<col />
						<col style="width: 9rem" />
						<col style="width: 8rem" />
						<col style="width: 9rem" />
					</colgroup>
					<thead>
						<tr class="h-9 bg-muted/40">
							<th class="text-left text-xs font-medium text-muted-foreground">Document</th>
							<th class="text-left text-xs font-medium text-muted-foreground">Signer</th>
							<th class="text-left text-xs font-medium text-muted-foreground">Completed</th>
							<th class="text-left text-xs font-medium text-muted-foreground">Status</th>
							<th class="w-36 text-right text-xs font-medium text-muted-foreground"></th>
						</tr>
					</thead>
					<tbody>
						{#if !workspaceId}
							<tr>
								<td colspan="5" class="py-12 text-center text-[13px] text-muted-foreground">
									Select a workspace to view signed documents.
								</td>
							</tr>
						{:else if sessionGroups.length === 0}
							<tr>
								<td colspan="5" class="py-12 text-center text-[13px] text-muted-foreground">
									No signed documents yet.
								</td>
							</tr>
						{:else}
							{#each sessionGroups as group (group.documentId)}
								{@const session = group.sessions[0]}
								<tr class="group border-b border-border/50 transition-colors hover:bg-accent/50">
									<td class="py-2.5">
										<p class="truncate text-[13px] font-medium text-foreground">
											{group.documentName}
										</p>
										{#if group.sessions.length > 1}
											<p class="mt-0.5 text-[11px] text-muted-foreground">
												{group.sessions.length} signed copies
											</p>
										{/if}
									</td>
									<td class="py-2.5">
										<p class="truncate text-[13px] text-foreground">
											{session?.signerName || "Anonymous signer"}
										</p>
										<p class="truncate text-[11px] text-muted-foreground">
											{session?.signerEmail || ""}
										</p>
									</td>
									<td class="py-2.5 text-[13px] text-muted-foreground">
										{session ? formatCompletedAt(session) : "—"}
									</td>
									<td class="py-2.5">
										{#if session}
											<StatusBadge status={session.status} />
										{/if}
									</td>
									<td class="py-2.5 text-right">
										{#if group.sessions.length > 1}
											<Button
												size="sm"
												variant="outline"
												class="h-7"
												onclick={() => {
													selectedGroup = group;
													groupQuery = "";
												}}
											>
												Open group
											</Button>
										{:else if session}
											<div class="inline-flex items-center justify-end gap-0.5">
												{#if session.finalizedFileUrl}
													<a
														href={session.finalizedFileUrl}
														target="_blank"
														rel="noreferrer"
														class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-foreground"
														aria-label="Download signed PDF"
														title="Download"
													>
														<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
															<path
																d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"
															/>
														</svg>
													</a>
												{/if}
												<button
													type="button"
													class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-red-600"
													aria-label="Delete signed copy"
													title="Delete"
													onclick={() => (sessionToDelete = session)}
												>
													<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
														<path
															d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
														/>
													</svg>
												</button>
											</div>
										{/if}
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</section>
	</main>
{/if}

{#if selectedGroup}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="sheet-overlay fixed inset-0 z-50 flex justify-end bg-background/40"
		onclick={() => (selectedGroup = null)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<aside
			class="sheet-panel flex h-full w-[min(92vw,36rem)] flex-col border-l border-border bg-background"
			onclick={(event) => event.stopPropagation()}
		>
			<div class="border-b border-border px-5 py-4">
				<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					Signed document group
				</p>
				<h2 class="mt-1 truncate text-base font-semibold">{selectedGroup.documentName}</h2>
				<p class="mt-1 text-[12px] text-muted-foreground">
					{selectedGroup.sessions.length} signed copies
				</p>
			</div>
			<div class="border-b border-border px-5 py-3">
				<div class="relative w-full">
					<MagnifyingGlassIcon
						class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						value={groupQuery}
						oninput={(event) => (groupQuery = (event.currentTarget as HTMLInputElement).value)}
						placeholder="Search signers..."
						class="h-7 rounded-[8px] border-border bg-background pl-8 text-xs"
					/>
				</div>
			</div>
			<div class="min-h-0 flex-1 overflow-auto p-5">
				<ul class="space-y-2">
					{#each selectedGroupSessions as session (session.id)}
						<li class="rounded-lg bg-muted/30 px-3 py-3">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">
										{session.signerName || "Anonymous signer"}
									</p>
									<p class="mt-1 truncate text-[12px] text-muted-foreground">
										{session.signerEmail || "No email"} · {formatCompletedAt(session)}
									</p>
								</div>
								<div class="flex shrink-0 items-center gap-0.5">
									{#if session.finalizedFileUrl}
										<a
											href={session.finalizedFileUrl}
											target="_blank"
											rel="noreferrer"
											class="inline-flex size-7 items-center justify-center rounded-md text-foreground/80 hover:text-foreground"
											aria-label="Download"
										>
											<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
												<path
													d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"
												/>
											</svg>
										</a>
									{/if}
									<button
										type="button"
										class="inline-flex size-7 items-center justify-center rounded-md text-foreground/80 hover:text-red-600"
										aria-label="Delete"
										onclick={() => (sessionToDelete = session)}
									>
										<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
											<path
												d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
											/>
										</svg>
									</button>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</aside>
	</div>
{/if}

<Dialog
	open={Boolean(sessionToDelete)}
	onOpenChange={(open) => {
		if (!open && !isDeletingSession) sessionToDelete = null;
	}}
>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Delete signed copy?</DialogTitle>
			<DialogDescription>
				This removes the signed copy from Signed Docs without affecting the source document setup.
			</DialogDescription>
		</DialogHeader>
		<div class="rounded-lg bg-muted/40 p-3 text-sm">
			{sessionToDelete?.documentName} · {sessionToDelete?.signerName || "Anonymous signer"}
		</div>
		<DialogFooter>
			<Button
				variant="outline"
				class="h-7"
				disabled={isDeletingSession}
				onclick={() => (sessionToDelete = null)}
			>
				Cancel
			</Button>
			<form method="POST" action="?/deleteSignedSession" use:enhance={deleteEnhance}>
				<input type="hidden" name="sessionId" value={sessionToDelete?.id || ""} />
				<Button type="submit" variant="destructive" class="h-7" loading={isDeletingSession}>
					Delete
				</Button>
			</form>
		</DialogFooter>
	</DialogContent>
</Dialog>
