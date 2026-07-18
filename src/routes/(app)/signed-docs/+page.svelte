<script lang="ts">
	import { enhance } from "$app/forms";
	import { format } from "date-fns";
	import { toast } from "svelte-sonner";
	import { MagnifyingGlassIcon } from "phosphor-svelte";
	import type {
		DocumentRecord,
		PacketActivitySummary,
		SessionRecord,
	} from "$lib/components/docs/types";
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
		groupId: string;
		documentId: string;
		documentName: string;
		sessions: SignedSession[];
		createdAt: string | number | Date;
		completedParties: number;
		totalParties: number;
		allPartiesSigned: boolean;
		downloadableCount: number;
	};

	let { data } = $props();

	let query = $state("");
	let selectedGroup = $state<SignedSessionGroup | null>(null);
	let groupQuery = $state("");
	let sessionToDelete = $state<SignedSession | null>(null);
	let isDeletingSession = $state(false);
	let selectedGroupIds = $state<string[]>([]);
	let isDownloadingZip = $state(false);

	const workspaceId = $derived(data.workspaceId || "");
	const documents = $derived((data.documents || []) as DocumentRecord[]);
	const loadError = $derived(data.error || null);

	const sessionGroups = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return documents
			.flatMap((document) => getDocumentGroups(document))
			.filter((group) => {
				if (!needle) return true;
				return [
					group.documentName,
					...group.sessions.flatMap((session) => [
						session.signerName,
						session.signerEmail,
						session.signerRole,
					]),
				]
					.filter(Boolean)
					.some((value) => String(value).toLowerCase().includes(needle));
			})
			.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);
	});

	const downloadableGroups = $derived(sessionGroups.filter((group) => group.downloadableCount > 0));
	const allDownloadableSelected = $derived(
		downloadableGroups.length > 0 &&
			downloadableGroups.every((group) => selectedGroupIds.includes(group.groupId)),
	);

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

	function formatCompletedAt(session: SignedSession, includeTime = false) {
		if (!session.completedAt) return "Not signed yet";
		return format(new Date(session.completedAt), includeTime ? "MMM d, yyyy 'at' h:mm a" : "MMM d, yyyy");
	}

	function getPacketParties(document: DocumentRecord, packet: PacketActivitySummary) {
		const sessions = (document.sessions || []).filter(
			(session) =>
				packet.copies.some((copy) => copy.id === session.id) ||
				session.id.startsWith(`packet-${packet.id}-`),
		);
		const roleSession = (roleName: string) =>
			sessions.find((session) => session.id === `packet-${packet.id}-${roleName}`);

		if (packet.copies.length > 0) {
			return packet.copies.map<SignedSession>((copy) => {
				const copySession = sessions.find((session) => session.id === copy.id);
				const sharedSession = roleSession(copy.roleName);
				const completedSession = [copySession, sharedSession].find(
					(session) => session?.status === "completed",
				);
				return {
					...(copySession || {
						id: copy.id,
						documentId: document.id,
						createdAt: copy.createdAt,
					}),
					documentName: document.name,
					signerName:
						copy.signerName ||
						(copySession?.signerName === copy.roleName
							? null
							: copySession?.signerName) ||
						(sharedSession?.signerName === copy.roleName
							? null
							: sharedSession?.signerName) ||
						null,
					signerEmail:
						copy.signerEmail ||
						copySession?.signerEmail ||
						sharedSession?.signerEmail ||
						null,
					signerRole: copy.roleName,
					status: completedSession ? "completed" : "pending",
					completedAt: completedSession?.completedAt || null,
					finalizedFileUrl:
						completedSession?.finalizedFileUrl || packet.finalizedFileUrl || null,
					finalizedStorageKey:
						completedSession?.finalizedStorageKey || packet.finalizedStorageKey || null,
				};
			});
		}

		return packet.roleConfigs.map<SignedSession>((role) => {
			const session = roleSession(role.name);
			return {
				...(session || {
					id: `packet-${packet.id}-${role.name}`,
					documentId: document.id,
					createdAt: packet.createdAt,
					status: "pending" as const,
				}),
				documentName: document.name,
				signerName:
					session?.signerName === role.name
						? null
						: session?.signerName || null,
				signerRole: role.name,
				finalizedFileUrl: session?.finalizedFileUrl || packet.finalizedFileUrl || null,
				finalizedStorageKey: session?.finalizedStorageKey || packet.finalizedStorageKey || null,
			};
		});
	}

	function makeGroup(input: {
		groupId: string;
		document: DocumentRecord;
		sessions: SignedSession[];
		createdAt: string | number | Date;
	}) {
		const completedParties = input.sessions.filter((session) => session.status === "completed").length;
		return {
			groupId: input.groupId,
			documentId: input.document.id,
			documentName: input.document.name,
			sessions: input.sessions,
			createdAt: input.createdAt,
			completedParties,
			totalParties: input.sessions.length,
			allPartiesSigned: input.sessions.length > 0 && completedParties === input.sessions.length,
			downloadableCount: getDownloadItems(input.sessions, input.document.name).length,
		} satisfies SignedSessionGroup;
	}

	function getDocumentGroups(document: DocumentRecord) {
		const copyIds = new Set((document.packets || []).flatMap((packet) => packet.copies.map((copy) => copy.id)));
		const packetGroups = (document.packets || []).flatMap((packet) => {
			const parties = getPacketParties(document, packet);
			if (!parties.some((party) => party.status === "completed")) return [];
			return [makeGroup({ groupId: `packet:${packet.id}`, document, sessions: parties, createdAt: packet.createdAt })];
		});
		const directGroups = (document.sessions || [])
			.filter(
				(session) =>
					session.status === "completed" &&
					!session.id.startsWith("packet-") &&
					!copyIds.has(session.id),
			)
			.map((session) =>
				makeGroup({
					groupId: `session:${session.id}`,
					document,
					sessions: [{ ...session, documentName: document.name }],
					createdAt: session.createdAt,
				}),
			);
		return [...packetGroups, ...directGroups];
	}

	function getDownloadItems(sessions: SignedSession[], documentName: string) {
		const seen = new Set<string>();
		return sessions.flatMap((session) => {
			const url = session.finalizedFileUrl || "";
			if (!url || seen.has(url)) return [];
			const match = url.match(/^\/api\/finalized\/(session|packet|copy)\/([^/?]+)/);
			if (!match) return [];
			seen.add(url);
			return [{
				kind: match[1] as "session" | "packet" | "copy",
				id: match[2],
				name: `${documentName}-${session.signerName || session.signerRole || "signed"}.pdf`,
			}];
		});
	}

	function toggleDocumentSelection(groupId: string) {
		selectedGroupIds = selectedGroupIds.includes(groupId)
			? selectedGroupIds.filter((id) => id !== groupId)
			: [...selectedGroupIds, groupId];
	}

	function toggleAllDownloads() {
		selectedGroupIds = allDownloadableSelected
			? []
			: downloadableGroups.map((group) => group.groupId);
	}

	async function downloadSelected() {
		const items = sessionGroups
			.filter((group) => selectedGroupIds.includes(group.groupId))
			.flatMap((group) => getDownloadItems(group.sessions, group.documentName));
		if (items.length === 0) return;

		isDownloadingZip = true;
		try {
			const response = await fetch("/api/finalized/batch", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ items }),
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.error || "Failed to prepare download");
			}
			const url = URL.createObjectURL(await response.blob());
			const link = document.createElement("a");
			link.href = url;
			link.download = "sleeksign-signed-documents.zip";
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to download documents");
		} finally {
			isDownloadingZip = false;
		}
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
				<div class="flex items-center gap-3">
					<p class="text-[12px] text-muted-foreground">
						{sessionGroups.length} signed documents
					</p>
					{#if selectedGroupIds.length > 0}
						<Button class="h-7" size="sm" loading={isDownloadingZip} onclick={downloadSelected}>
							Download ZIP ({selectedGroupIds.length})
						</Button>
					{/if}
				</div>
			</div>

			<div class="mt-5 min-h-0 flex-1 overflow-auto bg-background">
				<table class="w-full min-w-[720px] border-collapse table-auto md:table-fixed">
					<colgroup>
						<col style="width: 2.5rem" />
						<col style="width: 24rem" />
						<col />
						<col style="width: 9rem" />
						<col style="width: 8rem" />
						<col style="width: 9rem" />
					</colgroup>
					<thead>
						<tr class="h-9 bg-muted/40">
							<th class="text-left">
								<input
									type="checkbox"
									checked={allDownloadableSelected}
									disabled={downloadableGroups.length === 0}
									onchange={toggleAllDownloads}
									aria-label="Select all downloadable documents"
								/>
							</th>
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
								<td colspan="6" class="py-12 text-center text-[13px] text-muted-foreground">
									Select a workspace to view signed documents.
								</td>
							</tr>
						{:else if sessionGroups.length === 0}
							<tr>
								<td colspan="6" class="py-12 text-center text-[13px] text-muted-foreground">
									No signed documents yet.
								</td>
							</tr>
						{:else}
							{#each sessionGroups as group (group.groupId)}
								{@const session = group.sessions.find((party) => party.status === "completed") || group.sessions[0]}
								{@const downloadUrl = group.sessions.find((party) => party.finalizedFileUrl)?.finalizedFileUrl}
								{@const verificationId = group.sessions.find((party) => party.verificationId)?.verificationId}
								<tr class="group border-b border-border/50 transition-colors hover:bg-accent/50">
									<td class="py-2.5">
										<input
											type="checkbox"
											checked={selectedGroupIds.includes(group.groupId)}
											disabled={group.downloadableCount === 0}
											onchange={() => toggleDocumentSelection(group.groupId)}
											aria-label={`Select ${group.documentName}`}
										/>
									</td>
									<td class="py-2.5">
										<button
											type="button"
											class="block max-w-full truncate text-left text-[13px] font-medium text-foreground underline-offset-4 hover:underline"
											onclick={() => {
												selectedGroup = group;
												groupQuery = "";
											}}
										>
											{group.documentName}
										</button>
										<p class="mt-0.5 text-[11px] text-muted-foreground">
											{group.totalParties} {group.totalParties === 1 ? "party" : "parties"}
										</p>
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
										<span class="inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] font-medium {group.allPartiesSigned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
											{group.allPartiesSigned
												? "All parties signed"
												: `${group.completedParties} of ${group.totalParties} parties signed`}
										</span>
									</td>
									<td class="py-2.5 text-right">
										<div class="inline-flex items-center justify-end gap-1">
											<Button
												size="sm"
												variant="outline"
												class="h-7"
												onclick={() => {
													selectedGroup = group;
													groupQuery = "";
												}}
											>
												Overview
											</Button>
											{#if downloadUrl}
													<a
														href={`${downloadUrl}?download=1`}
														class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
														aria-label="Download signed PDF"
														title="Download"
													>
														<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
															<path
																d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"
															/>
														</svg>
													</a>
											{:else}
												<span
													class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground/40"
													title="Download available after all parties sign"
													aria-label="Download unavailable until all parties sign"
												>
													<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor">
														<path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z" />
													</svg>
												</span>
											{/if}
											{#if verificationId}
												<a
													href={`/verify/${verificationId}`}
													target="_blank"
													rel="noreferrer"
													class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted"
													aria-label="Verify document integrity"
													title="Verify integrity"
												>
													<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 4.5 6v5.2c0 4.6 3.2 8.2 7.5 9.8 4.3-1.6 7.5-5.2 7.5-9.8V6L12 3Z" /><path d="m8.7 12 2.1 2.1 4.6-4.7" /></svg>
												</a>
											{/if}
											{#if group.groupId.startsWith("session:") && session}
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
											{/if}
										</div>
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
	{@const selectedDownloadUrl = selectedGroup.sessions.find((party) => party.finalizedFileUrl)?.finalizedFileUrl}
	{@const selectedVerificationId = selectedGroup.sessions.find((party) => party.verificationId)?.verificationId}
	<div class="sheet-overlay fixed inset-0 z-50 flex justify-end bg-background/40">
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			aria-label="Close signed document details"
			onclick={() => (selectedGroup = null)}
		></button>
		<aside
			class="sheet-panel relative z-10 flex h-full w-[min(96vw,40rem)] flex-col border-l border-border bg-background"
		>
			<div class="border-b border-border px-5 py-5">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Signing overview</p>
						<h2 class="mt-1 truncate text-base font-semibold">{selectedGroup.documentName}</h2>
						<p class="mt-1 text-[12px] text-muted-foreground">
							{selectedGroup.allPartiesSigned
								? "All parties have completed their parts"
								: `${selectedGroup.completedParties} of ${selectedGroup.totalParties} parties signed`}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						{#if selectedDownloadUrl}
							<a href={`${selectedDownloadUrl}?download=1`} class="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
								<svg class="size-3.5" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z" /></svg>
								Download
							</a>
						{/if}
						{#if selectedVerificationId}
							<a href={`/verify/${selectedVerificationId}`} target="_blank" rel="noreferrer" class="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-muted">Verify</a>
						{/if}
						<button type="button" class="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close overview" onclick={() => (selectedGroup = null)}>
							<svg class="size-4" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" /></svg>
						</button>
					</div>
				</div>
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
				<ul class="space-y-2.5">
					{#each selectedGroupSessions as session (session.id)}
						<li class="rounded-lg border border-border bg-background px-4 py-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="flex min-w-0 items-center gap-2">
										<p class="truncate text-sm font-medium">{session.signerName || "Anonymous signer"}</p>
										<span class="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{session.signerRole || "Signer"}</span>
									</div>
									<p class="mt-1 truncate text-[12px] text-muted-foreground">
										{session.signerEmail || "No email provided"}
									</p>
									<p class="mt-2 text-[11px] text-muted-foreground">
										{session.status === "completed" ? `Signed ${formatCompletedAt(session, true)}` : "Waiting for this party to sign"}
									</p>
								</div>
								<span class="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium {session.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
									{session.status === "completed" ? "Signed" : "Awaiting signature"}
								</span>
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
