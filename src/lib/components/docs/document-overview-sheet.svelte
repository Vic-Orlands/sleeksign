<script lang="ts">
	import { browser } from "$app/environment";
	import { format } from "date-fns";
	import { CopyIcon } from "phosphor-svelte";
	import { toast } from "svelte-sonner";
	import StatusBadge from "$lib/components/docs/status-badge.svelte";
	import type { DocumentRecord, PacketActivitySummary } from "$lib/components/docs/types";
	import {
		getDocumentCounts,
		getDocumentSetupStatus,
		getDocumentShareActivity,
		getDocumentStatus,
		getFieldTypeLabel,
		getRecipientTypeLabel,
		getWorkflowModeLabel,
	} from "$lib/components/docs/types";
	import Button from "$lib/components/ui/button.svelte";
	import { postFormAction } from "$lib/form-action";
	import type { WorkflowMode } from "$lib/field-utils";
	import { cn } from "$lib/utils";

	type ActivityTab = "email" | "signing" | "fields";

	const ACTIVITY_TABS: Array<{ id: ActivityTab; label: string }> = [
		{ id: "email", label: "Email Link" },
		{ id: "signing", label: "Signing link" },
		{ id: "fields", label: "Signature fields" },
	];

	let {
		document: overviewDocument = null,
		open = $bindable(false),
		variant = "default",
		onOpenSetup,
	}: {
		document?: DocumentRecord | null;
		open?: boolean;
		variant?: "default" | "activity";
		onOpenSetup: (document: DocumentRecord) => void;
	} = $props();

	let isCreatingPacket = $state(false);
	let activityTab = $state<ActivityTab>("email");

	const detail = $derived(overviewDocument);
	const counts = $derived(detail ? getDocumentCounts(detail) : null);
	const activity = $derived(detail ? getDocumentShareActivity(detail) : null);
	const allFieldsAssigned = $derived(
		detail ? (detail.fields || []).every((field) => Boolean(field.assigneeRole)) : false,
	);
	const isActivity = $derived(variant === "activity");
	const origin = $derived(browser ? window.location.origin : "");
	const activityTabIndex = $derived(
		Math.max(
			0,
			ACTIVITY_TABS.findIndex((tab) => tab.id === activityTab),
		),
	);

	$effect(() => {
		if (!open || !detail?.id) return;
		activityTab = "email";
	});

	async function createPacketAndShare(mode: WorkflowMode = "shared-base") {
		if (!detail) return;

		isCreatingPacket = true;
		try {
			const result = await postFormAction<{ packetId?: string }>(
				"shareDocument",
				{
					documentId: detail.id,
					mode,
				},
				{ apply: false },
			);
			if (!result.packetId) throw new Error("Failed to prepare share links");
			window.location.href = `/share/${result.packetId}`;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to prepare share links");
		} finally {
			isCreatingPacket = false;
		}
	}

	function emailInviteUrl(packetId: string, roleName: string, copyId: string) {
		return `${origin}/sign/packet/${packetId}?role=${encodeURIComponent(roleName)}&copyId=${encodeURIComponent(copyId)}`;
	}

	function signingEntryLinks(packet: PacketActivitySummary) {
		if (!detail) return [];
		const roles =
			packet.roleConfigs.length > 0
				? packet.roleConfigs
				: (detail.roleConfigs || []).map((role) => ({
						name: role.name,
						scope: role.scope,
					}));
		return roles.map((role) => ({
			role,
			url: `${origin}/sign/p/${detail.id}?packet=${encodeURIComponent(packet.id)}&role=${encodeURIComponent(role.name)}`,
		}));
	}

	async function copyLink(url: string, label = "Link") {
		try {
			await navigator.clipboard.writeText(url);
			toast.success(`${label} copied`);
		} catch {
			toast.error("Unable to copy link");
		}
	}

	function close() {
		open = false;
	}
</script>

{#if open && detail}
	<div class="fixed inset-0 z-50 flex justify-end">
		<button
			type="button"
			class="absolute inset-0 bg-background/40"
			aria-label="Close overview"
			onclick={close}
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="document-overview-title"
			class="relative flex h-full w-[min(96vw,40rem)] flex-col border-l border-border bg-background"
		>
			<div class="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
				<div class="min-w-0">
					<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{isActivity ? "Shared activity" : "Overview"}
					</p>
					<h2
						id="document-overview-title"
						class="mt-1 truncate text-lg font-semibold tracking-tight"
					>
						{detail.name}
					</h2>
				</div>
				<Button variant="ghost" size="sm" onclick={close}>Close</Button>
			</div>

			<div class="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-4">
				<div class="flex flex-wrap items-center gap-2">
					<StatusBadge status={getDocumentStatus(detail)} />
					<span class="text-[13px] text-muted-foreground">
						{getDocumentSetupStatus(detail)}
					</span>
				</div>

				{#if counts}
					<div class="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
						<div>
							<p class="text-muted-foreground">Fields</p>
							<p class="font-medium">{counts.fields}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Sessions</p>
							<p class="font-medium">{counts.total}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Completed</p>
							<p class="font-medium">{counts.completed}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Created</p>
							<p class="font-medium">
								{detail.createdAt
									? format(new Date(detail.createdAt), "MMM d, yyyy")
									: "—"}
							</p>
						</div>
					</div>
				{/if}

				{#if activity && isActivity}
					<section class="space-y-2">
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							Workflow model
						</p>
						{#if activity.modes.length > 0}
							<div class="flex flex-wrap gap-2">
								{#each activity.modes as mode (mode)}
									<span
										class="rounded-md border border-border px-2 py-1 text-[12px] font-medium text-foreground"
									>
										{getWorkflowModeLabel(mode)}
									</span>
								{/each}
							</div>
						{:else}
							<p class="text-[13px] text-muted-foreground">No packet model recorded yet.</p>
						{/if}
					</section>

					<div>
						<div class="relative grid grid-cols-3 border-b border-border">
							{#each ACTIVITY_TABS as tab (tab.id)}
								<button
									type="button"
									class={cn(
										"pb-2.5 text-center text-[13px] transition-colors",
										activityTab === tab.id
											? "font-medium text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
									onclick={() => (activityTab = tab.id)}
								>
									{tab.label}
								</button>
							{/each}
							<div
								class="pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/3 bg-foreground transition-transform duration-300 ease-out"
								style={`transform: translateX(${activityTabIndex * 100}%)`}
							></div>
						</div>

						<div class="mt-4 overflow-hidden">
							<div
								class="flex transition-transform duration-300 ease-out"
								style={`transform: translateX(-${activityTabIndex * 100}%)`}
							>
								<div class="w-full shrink-0 space-y-3 pr-1">
									{#if activity.emailedRecipients.length > 0}
										{#each activity.emailedRecipients as recipient (recipient.id)}
											{@const url = emailInviteUrl(
												recipient.packetId,
												recipient.roleName,
												recipient.id,
											)}
											<div class="rounded-md border border-border/70 px-3 py-3">
												<div class="flex items-start justify-between gap-3">
													<div class="min-w-0">
														<p class="text-[13px] font-medium text-foreground">
															{recipient.signerName || recipient.roleName}
														</p>
														<p class="text-[12px] text-muted-foreground">
															{recipient.signerEmail}
														</p>
														<p class="mt-1 text-[11px] text-muted-foreground">
															{getRecipientTypeLabel(recipient.recipientType)} ·
															{getWorkflowModeLabel(recipient.mode)} · {recipient.status} ·
															{format(new Date(recipient.createdAt), "MMM d, yyyy")}
														</p>
													</div>
													<Button
														variant="outline"
														size="sm"
														class="h-7 shrink-0 gap-1.5"
														onclick={() => copyLink(url, "Email link")}
													>
														<CopyIcon class="size-3.5" />
														Copy
													</Button>
												</div>
												<p class="mt-2 truncate font-mono text-[11px] text-muted-foreground">
													{url}
												</p>
											</div>
										{/each}
									{:else}
										<p class="text-[13px] text-muted-foreground">Not shared via email.</p>
									{/if}
								</div>

								<div class="w-full shrink-0 space-y-3 px-1">
									{#if activity.hasLinkShare}
										{#each activity.linkPackets as packet (packet.id)}
											<div class="space-y-2 rounded-md border border-border/70 px-3 py-3">
												<div>
													<p class="text-[13px] font-medium text-foreground">
														Link created · {getWorkflowModeLabel(packet.mode)}
													</p>
													<p class="mt-1 text-[11px] text-muted-foreground">
														{packet.status} ·
														{format(new Date(packet.createdAt), "MMM d, yyyy")} · Not emailed
													</p>
												</div>
												{#each signingEntryLinks(packet) as { role, url } (`${packet.id}-${role.name}`)}
													<div
														class="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-2"
													>
														<div class="min-w-0">
															<p class="text-[12px] font-medium text-foreground">{role.name}</p>
															<p class="truncate font-mono text-[11px] text-muted-foreground">
																{url}
															</p>
														</div>
														<Button
															variant="outline"
															size="sm"
															class="h-7 shrink-0 gap-1.5"
															onclick={() => copyLink(url, `${role.name} link`)}
														>
															<CopyIcon class="size-3.5" />
															Copy
														</Button>
													</div>
												{/each}
											</div>
										{/each}
									{:else}
										<p class="text-[13px] text-muted-foreground">
											No standalone signing link recorded.
										</p>
									{/if}
								</div>

								<div class="w-full shrink-0 space-y-3 pl-1">
									{#if counts}
										<p class="text-[13px] text-muted-foreground">
											{counts.signatureFields} total · {counts.requiredSignatures} mandatory ·
											{counts.optionalSignatures} optional
										</p>
									{/if}
									{#if activity.signatureFields.length > 0}
										<ul class="space-y-2">
											{#each activity.signatureFields as field (field.id)}
												<li
													class="flex items-center justify-between gap-3 rounded-md border border-border/70 px-3 py-2 text-[13px]"
												>
													<div class="min-w-0">
														<p class="font-medium text-foreground">
															{getFieldTypeLabel(field.type)}
															{#if field.assigneeRole}
																· {field.assigneeRole}
															{/if}
														</p>
														<p class="text-[11px] text-muted-foreground">
															Page {field.page + 1}
														</p>
													</div>
													<span
														class="shrink-0 text-[11px] font-medium {field.required
															? 'text-foreground'
															: 'text-muted-foreground'}"
													>
														{field.required ? "Mandatory" : "Optional"}
													</span>
												</li>
											{/each}
										</ul>
									{:else}
										<p class="text-[13px] text-muted-foreground">
											No signature fields on this document.
										</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{:else if activity && (activity.packets.length > 0 || activity.hasEmailShare || activity.hasLinkShare)}
					<section class="space-y-2">
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							Workflow model
						</p>
						{#if activity.modes.length > 0}
							<div class="flex flex-wrap gap-2">
								{#each activity.modes as mode (mode)}
									<span
										class="rounded-md border border-border px-2 py-1 text-[12px] font-medium text-foreground"
									>
										{getWorkflowModeLabel(mode)}
									</span>
								{/each}
							</div>
						{:else}
							<p class="text-[13px] text-muted-foreground">No packet model recorded yet.</p>
						{/if}
					</section>
				{/if}

				{#if !allFieldsAssigned && !isActivity}
					<p class="text-[13px] text-amber-700 dark:text-amber-400">
						Assign every field to a signer role before sharing.
					</p>
				{/if}
			</div>

			<div class="flex flex-col gap-2 border-t border-border px-5 py-4">
				<Button
					onclick={() => onOpenSetup(detail)}
					variant="outline"
					class="w-full justify-center"
				>
					Open setup
				</Button>
				{#if !isActivity}
					<Button
					onclick={() => createPacketAndShare("shared-base")}
						disabled={isCreatingPacket || !allFieldsAssigned || !(detail.fields || []).length}
						class="w-full justify-center"
					>
						{isCreatingPacket ? "Preparing…" : "Share for signing"}
					</Button>
				{/if}
			</div>
		</div>
	</div>
{/if}
