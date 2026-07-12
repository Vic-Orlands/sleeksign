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
	import { cn } from "$lib/utils";
	import { setCurrentWorkspaceId } from "$lib/workspace-store.svelte";
	import type { ActionResult, SubmitFunction } from "@sveltejs/kit";

	type SignerTab = "directory" | "groups" | "activity";
	type SignerGroup = {
		id: string;
		name: string;
		description?: string | null;
		signers?: Array<{ id: string; name: string; email: string }>;
	};
	type DirectorySigner = {
		id: string;
		name: string;
		email: string;
		title?: string | null;
		teamName?: string | null;
	};
	type TeamPayload = { id: string; name: string };

	const TABS: Array<{ value: SignerTab; label: string }> = [
		{ value: "directory", label: "Directory" },
		{ value: "groups", label: "Groups" },
		{ value: "activity", label: "Activity" },
	];

	let { data } = $props();

	let query = $state("");
	let activeTab = $state<SignerTab>("directory");
	let busyAction = $state("");
	let newSignerOpen = $state(false);
	let newSignerName = $state("");
	let newSignerEmail = $state("");
	let newSignerTitle = $state("");
	let newSignerTeamId = $state("");
	let newGroupOpen = $state(false);
	let newGroupName = $state("");
	let newGroupDescription = $state("");
	let selectedGroupMemberIds = $state<string[]>([]);
	let groupToDelete = $state<SignerGroup | null>(null);
	let directorySignerToDelete = $state<DirectorySigner | null>(null);
	let signerToDelete = $state<(SessionRecord & { documentName: string }) | null>(null);
	let selectedGroup = $state<SignerGroup | null>(null);

	const workspaceId = $derived(data.workspaceId || "");
	const documents = $derived((data.documents || []) as DocumentRecord[]);
	const signerGroups = $derived((data.signerGroups || []) as SignerGroup[]);
	const directorySigners = $derived((data.directorySigners || []) as DirectorySigner[]);
	const teams = $derived((data.teams || []) as TeamPayload[]);

	const filteredDirectory = $derived(
		filterRows(directorySigners, query, (s) => [s.name, s.email, s.title, s.teamName]),
	);
	const filteredGroups = $derived(
		filterRows(signerGroups, query, (g) => [g.name, g.description]),
	);
	const activityRows = $derived(
		documents.flatMap((doc) =>
			(doc.sessions || []).map((session) => ({ ...session, documentName: doc.name })),
		),
	);
	const filteredActivity = $derived(
		filterRows(activityRows, query, (s) => [s.signerName, s.signerEmail, s.documentName]),
	);

	const columnCount = $derived(activeTab === "groups" ? 4 : 5);

	$effect(() => {
		if (workspaceId) setCurrentWorkspaceId(workspaceId);
	});

	function filterRows<T>(
		rows: T[],
		needle: string,
		pick: (row: T) => Array<string | null | undefined>,
	) {
		const q = needle.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((row) =>
			pick(row)
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q)),
		);
	}

	function makeEnhance(action: string, onSuccess: () => void): SubmitFunction {
		return () => {
			busyAction = action;
			return async ({ result, update }) => {
				busyAction = "";
				const actionResult = result as ActionResult;
				if (actionResult.type === "success") {
					onSuccess();
					toast.success(
						(actionResult.data as { message?: string } | undefined)?.message || "Done",
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

	function toggleGroupMember(id: string) {
		selectedGroupMemberIds = selectedGroupMemberIds.includes(id)
			? selectedGroupMemberIds.filter((entry) => entry !== id)
			: [...selectedGroupMemberIds, id];
	}
</script>

<main class="flex h-full min-h-0 flex-col overflow-hidden bg-background">
	<section class="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col py-8">
		<div class="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
			<div class="flex min-w-0 items-center gap-3">
				<h1 class="shrink-0 text-xl font-semibold text-foreground">Signers</h1>
				<div class="relative w-62">
					<MagnifyingGlassIcon
						class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						bind:value={query}
						placeholder="Search signers..."
						class="h-7 rounded-[8px] border-border bg-background pl-8 text-xs"
					/>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					class="h-7 gap-2"
					onclick={() => (newGroupOpen = true)}
				>
					Assemble Group
				</Button>
				<Button type="button" class="h-7 gap-2" onclick={() => (newSignerOpen = true)}>
					New Signer
				</Button>
			</div>
		</div>

		<div class="mt-5 inline-flex items-center gap-1">
			{#each TABS as tab (tab.value)}
				<button
					type="button"
					class={cn(
						"h-7 rounded-md px-3 text-xs transition-colors",
						activeTab === tab.value
							? "bg-foreground font-medium text-background"
							: "text-foreground/70 hover:bg-muted hover:text-foreground",
					)}
					onclick={() => (activeTab = tab.value)}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="mt-5 min-h-0 flex-1 overflow-auto bg-background">
			<table class="w-full min-w-[720px] border-collapse table-auto md:table-fixed">
				<colgroup>
					{#if activeTab === "directory"}
						<col style="width: 16rem" />
						<col />
						<col />
						<col />
						<col style="width: 9rem" />
					{:else if activeTab === "groups"}
						<col style="width: 16rem" />
						<col style="width: 8rem" />
						<col />
						<col style="width: 9rem" />
					{:else}
						<col style="width: 16rem" />
						<col />
						<col style="width: 8rem" />
						<col style="width: 9rem" />
						<col style="width: 9rem" />
					{/if}
				</colgroup>
				<thead>
					<tr class="h-9 bg-muted/40">
						{#if activeTab === "directory"}
							{#each ["Name", "Email", "Title", "Team", ""] as col, index (col || `a-${index}`)}
								<th
									class={cn(
										"text-left text-xs font-medium text-muted-foreground",
										col === "" && "w-36",
									)}
								>
									{col}
								</th>
							{/each}
						{:else if activeTab === "groups"}
							{#each ["Group", "Members", "Description", ""] as col, index (col || `a-${index}`)}
								<th
									class={cn(
										"text-left text-xs font-medium text-muted-foreground",
										col === "" && "w-36",
									)}
								>
									{col}
								</th>
							{/each}
						{:else}
							{#each ["Document", "Signer", "Status", "Created", ""] as col, index (col || `a-${index}`)}
								<th
									class={cn(
										"text-left text-xs font-medium text-muted-foreground",
										col === "" && "w-36",
									)}
								>
									{col}
								</th>
							{/each}
						{/if}
					</tr>
				</thead>
				<tbody>
					{#if activeTab === "directory"}
						{#if filteredDirectory.length === 0}
							<tr>
								<td
									colspan={columnCount}
									class="py-12 text-center text-[13px] text-muted-foreground"
								>
									{workspaceId ? "No signers found." : "Select a workspace to view signers."}
								</td>
							</tr>
						{:else}
							{#each filteredDirectory as signer (signer.id)}
								<tr class="border-b border-border/50 transition-colors hover:bg-accent/50">
									<td class="py-2.5">
										<p class="truncate text-[13px] font-medium text-foreground">{signer.name}</p>
									</td>
									<td class="py-2.5 text-[13px] text-muted-foreground">{signer.email}</td>
									<td class="py-2.5 text-[13px] text-muted-foreground">{signer.title || "—"}</td>
									<td class="py-2.5 text-[13px] text-muted-foreground">
										{signer.teamName || "—"}
									</td>
									<td class="py-2.5 text-right">
										<button
											type="button"
											class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-red-600"
											aria-label={`Delete ${signer.name}`}
											title="Delete"
											onclick={() => (directorySignerToDelete = signer)}
										>
											<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
												<path
													d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
												/>
											</svg>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					{:else if activeTab === "groups"}
						{#if filteredGroups.length === 0}
							<tr>
								<td
									colspan={columnCount}
									class="py-12 text-center text-[13px] text-muted-foreground"
								>
									No groups found.
								</td>
							</tr>
						{:else}
							{#each filteredGroups as group (group.id)}
								<tr class="border-b border-border/50 transition-colors hover:bg-accent/50">
									<td class="py-2.5">
										<button
											type="button"
											class="truncate text-[13px] font-medium text-foreground hover:underline"
											onclick={() => (selectedGroup = group)}
										>
											{group.name}
										</button>
									</td>
									<td class="py-2.5 text-[13px] tabular-nums text-muted-foreground">
										{group.signers?.length || 0}
									</td>
									<td class="py-2.5 text-[13px] text-muted-foreground">
										{group.description || "—"}
									</td>
									<td class="py-2.5 text-right">
										<button
											type="button"
											class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-red-600"
											aria-label={`Delete ${group.name}`}
											title="Delete"
											onclick={() => (groupToDelete = group)}
										>
											<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
												<path
													d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
												/>
											</svg>
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					{:else if filteredActivity.length === 0}
						<tr>
							<td
								colspan={columnCount}
								class="py-12 text-center text-[13px] text-muted-foreground"
							>
								No activity yet.
							</td>
						</tr>
					{:else}
						{#each filteredActivity as session (session.id)}
							<tr class="border-b border-border/50 transition-colors hover:bg-accent/50">
								<td class="py-2.5">
									<p class="truncate text-[13px] font-medium text-foreground">
										{session.documentName}
									</p>
								</td>
								<td class="py-2.5 text-[13px] text-muted-foreground">
									{session.signerName || session.signerEmail || "—"}
								</td>
								<td class="py-2.5"><StatusBadge status={session.status} /></td>
								<td class="py-2.5 text-[13px] text-muted-foreground">
									{format(new Date(session.createdAt), "MMM d, yyyy")}
								</td>
								<td class="py-2.5 text-right">
									<button
										type="button"
										class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:text-red-600"
										aria-label="Delete session"
										title="Delete"
										onclick={() => (signerToDelete = session)}
									>
										<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
											<path
												d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"
											/>
										</svg>
									</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</main>

{#if selectedGroup}
	<div
		class="sheet-panel fixed inset-y-0 right-0 z-50 w-[min(92vw,24rem)] border-l border-border bg-background p-5"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-base font-semibold">{selectedGroup.name}</h2>
				<p class="mt-1 text-[13px] text-muted-foreground">
					{selectedGroup.signers?.length || 0} members
				</p>
			</div>
			<Button variant="ghost" size="sm" class="h-7" onclick={() => (selectedGroup = null)}>
				Close
			</Button>
		</div>
		<ul class="mt-4 space-y-3">
			{#each selectedGroup.signers || [] as signer (signer.id)}
				<li>
					<p class="text-[13px] font-medium">{signer.name}</p>
					<p class="text-[13px] text-muted-foreground">{signer.email}</p>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<Dialog open={newSignerOpen} onOpenChange={(open) => !open && (newSignerOpen = false)}>
	<DialogContent>
		<form
			method="POST"
			action="?/createSigner"
			class="contents"
			use:enhance={makeEnhance("create-signer", () => {
				newSignerOpen = false;
				newSignerName = "";
				newSignerEmail = "";
				newSignerTitle = "";
				newSignerTeamId = "";
			})}
		>
			<DialogHeader>
				<DialogTitle>Register Signer</DialogTitle>
				<DialogDescription>Add a signer to the workspace directory.</DialogDescription>
			</DialogHeader>
			<div class="space-y-3">
				<Input
					name="name"
					bind:value={newSignerName}
					placeholder="Full name"
					class="h-7 rounded-[8px] text-xs"
					required
				/>
				<Input
					name="email"
					bind:value={newSignerEmail}
					placeholder="Email"
					type="email"
					class="h-7 rounded-[8px] text-xs"
					required
				/>
				<Input
					name="title"
					bind:value={newSignerTitle}
					placeholder="Title (optional)"
					class="h-7 rounded-[8px] text-xs"
				/>
				<select
					name="teamId"
					class="h-7 w-full rounded-[8px] border border-border bg-background px-2.5 text-xs"
					bind:value={newSignerTeamId}
				>
					<option value="">Global workspace</option>
					{#each teams as team (team.id)}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
			</div>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					class="h-7"
					onclick={() => (newSignerOpen = false)}
				>
					Cancel
				</Button>
				<Button type="submit" class="h-7" loading={busyAction === "create-signer"}>
					Add Signer
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog open={newGroupOpen} onOpenChange={(open) => !open && (newGroupOpen = false)}>
	<DialogContent>
		<form
			method="POST"
			action="?/createGroup"
			class="contents"
			use:enhance={makeEnhance("create-group", () => {
				newGroupOpen = false;
				newGroupName = "";
				newGroupDescription = "";
				selectedGroupMemberIds = [];
			})}
		>
			<DialogHeader>
				<DialogTitle>Assemble Group</DialogTitle>
				<DialogDescription>Create a signer group from directory entries.</DialogDescription>
			</DialogHeader>
			<div class="space-y-3">
				<Input
					name="name"
					bind:value={newGroupName}
					placeholder="Group name"
					class="h-7 rounded-[8px] text-xs"
					required
				/>
				<Input
					name="description"
					bind:value={newGroupDescription}
					placeholder="Description (optional)"
					class="h-7 rounded-[8px] text-xs"
				/>
				<div class="max-h-48 space-y-2 overflow-auto rounded-[8px] bg-muted/40 p-2">
					{#each directorySigners as signer (signer.id)}
						<label class="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								name="signerIds"
								value={signer.id}
								checked={selectedGroupMemberIds.includes(signer.id)}
								onchange={() => toggleGroupMember(signer.id)}
							/>
							<span>{signer.name} · {signer.email}</span>
						</label>
					{/each}
				</div>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" class="h-7" onclick={() => (newGroupOpen = false)}>
					Cancel
				</Button>
				<Button type="submit" class="h-7" loading={busyAction === "create-group"}>
					Create Group
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog open={Boolean(groupToDelete)} onOpenChange={(open) => !open && (groupToDelete = null)}>
	<DialogContent>
		<form
			method="POST"
			action="?/deleteGroup"
			class="contents"
			use:enhance={makeEnhance("delete-group", () => {
				if (selectedGroup?.id === groupToDelete?.id) selectedGroup = null;
				groupToDelete = null;
			})}
		>
			<input type="hidden" name="groupId" value={groupToDelete?.id || ""} />
			<DialogHeader>
				<DialogTitle>Delete group?</DialogTitle>
				<DialogDescription>Delete {groupToDelete?.name}?</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					class="h-7"
					onclick={() => (groupToDelete = null)}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					variant="destructive"
					class="h-7"
					loading={busyAction === "delete-group"}
				>
					Delete
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog
	open={Boolean(directorySignerToDelete)}
	onOpenChange={(open) => !open && (directorySignerToDelete = null)}
>
	<DialogContent>
		<form
			method="POST"
			action="?/deleteSigner"
			class="contents"
			use:enhance={makeEnhance("delete-directory-signer", () => {
				directorySignerToDelete = null;
			})}
		>
			<input type="hidden" name="signerId" value={directorySignerToDelete?.id || ""} />
			<DialogHeader>
				<DialogTitle>Delete signer?</DialogTitle>
				<DialogDescription>
					Remove {directorySignerToDelete?.name} from the directory.
				</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					class="h-7"
					onclick={() => (directorySignerToDelete = null)}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					variant="destructive"
					class="h-7"
					loading={busyAction === "delete-directory-signer"}
				>
					Delete
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<Dialog open={Boolean(signerToDelete)} onOpenChange={(open) => !open && (signerToDelete = null)}>
	<DialogContent>
		<form
			method="POST"
			action="?/deleteActivity"
			class="contents"
			use:enhance={makeEnhance("delete-activity", () => {
				signerToDelete = null;
			})}
		>
			<input type="hidden" name="sessionId" value={signerToDelete?.id || ""} />
			<DialogHeader>
				<DialogTitle>Delete session record?</DialogTitle>
				<DialogDescription>This removes the signing activity record.</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					class="h-7"
					onclick={() => (signerToDelete = null)}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					variant="destructive"
					class="h-7"
					loading={busyAction === "delete-activity"}
				>
					Delete
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
