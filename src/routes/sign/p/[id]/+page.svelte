<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { toast } from "svelte-sonner";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";

	type PublicDocument = { id: string; name: string; signerRoles: string[] };
	type PublicPacket = {
		id: string;
		roleConfigs: Array<{ name: string; scope: "shared" | "private" }>;
		document: { id: string; name: string };
	};

	let isLoading = $state(true);
	let isCreating = $state(false);
	let loadError = $state<string | null>(null);
	let doc = $state<PublicDocument | null>(null);
	let packet = $state<PublicPacket | null>(null);

	let signerName = $state("");
	let signerEmail = $state("");
	let signerRole = $state("");

	const documentId = $derived($page.params.id);
	const packetId = $derived($page.url.searchParams.get("packet") || "");
	const requestedRole = $derived($page.url.searchParams.get("role") || "");

	$effect(() => {
		if (typeof window !== "undefined") {
			try {
				const saved = JSON.parse(localStorage.getItem("sleeksign:last-signer") || "{}") as {
					signerName?: string;
					signerEmail?: string;
					signerRole?: string;
				};
				signerName = saved.signerName || "";
				signerEmail = saved.signerEmail || "";
				signerRole = saved.signerRole || "";
			} catch {
				/* ignore */
			}
		}
	});

	$effect(() => {
		const id = documentId;
		const pId = packetId;
		if (!id) return;

		isLoading = true;
		const target = pId ? `/api/public-packets/${pId}` : `/api/public-documents/${id}`;
		void fetch(target)
			.then(async (res) => {
				const data = await res.json();
				if (!res.ok || data.error) throw new Error(data.error || "Document not found");
				if (pId) packet = data as PublicPacket;
				else doc = data as PublicDocument;
			})
			.catch((error) => {
				loadError = error instanceof Error ? error.message : "Document not found";
			})
			.finally(() => {
				isLoading = false;
			});
	});

	const roleOptions = $derived(
		packet ? packet.roleConfigs.map((role) => role.name) : doc?.signerRoles || [],
	);
	const effectiveSignerRole = $derived(
		signerRole && roleOptions.includes(signerRole)
			? signerRole
			: requestedRole && roleOptions.includes(requestedRole)
				? requestedRole
				: roleOptions[0] || "",
	);

	async function startSigning(event: SubmitEvent) {
		event.preventDefault();
		if (!signerName.trim()) {
			toast.error("Enter your full name");
			return;
		}
		if (!effectiveSignerRole) {
			toast.error("Select who is signing");
			return;
		}

		isCreating = true;
		try {
			localStorage.setItem(
				"sleeksign:last-signer",
				JSON.stringify({
					signerName: signerName.trim(),
					signerEmail: signerEmail.trim(),
					signerRole: effectiveSignerRole,
				}),
			);

			if (packetId) {
				const copyRes = await fetch("/api/public-packet-copies", {
					method: "POST",
					body: JSON.stringify({
						packetId,
						roleName: effectiveSignerRole,
						signerName,
						signerEmail,
					}),
				});
				const copyData = await copyRes.json();
				void goto(
					`/sign/packet/${packetId}?role=${encodeURIComponent(effectiveSignerRole)}${
						copyData.copyId ? `&copyId=${encodeURIComponent(copyData.copyId)}` : ""
					}`,
				);
				return;
			}

			const res = await fetch("/api/sessions", {
				method: "POST",
				body: JSON.stringify({
					documentId,
					signerName,
					signerEmail,
					signerRole: effectiveSignerRole,
				}),
			});
			const data = await res.json();
			if (!data.sessionId) throw new Error("No session created");
			void goto(`/sign/${data.sessionId}`);
		} catch {
			toast.error("Failed to initialize signing session");
			isCreating = false;
		}
	}
</script>

{#if isLoading}
	<div class="flex h-screen items-center justify-center bg-background">
		<svg class="size-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
		</svg>
	</div>
{:else if loadError || (!doc && !packet)}
	<div class="flex h-screen items-center justify-center bg-background">Document not found</div>
{:else}
	<div class="flex min-h-screen items-center justify-center bg-(--paper) p-6">
		<main class="grid w-full max-w-5xl overflow-hidden border border-border bg-card lg:grid-cols-[0.9fr_1.1fr]">
			<section class="sleek-grid border-b border-border bg-background p-8 lg:border-b-0 lg:border-r">
				<h1 class="mt-6 max-w-[17rem] font-mono text-2xl font-semibold uppercase leading-tight sm:max-w-full sm:text-3xl">
					Review and sign securely
				</h1>
				<p class="mt-3 max-w-md leading-7 text-muted-foreground">
					This signing session records your name, completion time, and audit metadata.
				</p>
				<div class="mt-8 border border-border bg-background p-4">
					<p class="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Document</p>
					<h2 class="truncate font-semibold">{packet?.document.name || doc?.name}</h2>
				</div>
			</section>

			<form class="flex flex-col gap-5 p-8" onsubmit={startSigning}>
				<div>
					<h2 class="font-mono text-xs font-semibold uppercase tracking-widest">Before you start</h2>
					<p class="mt-1 text-sm text-muted-foreground">Enter your legal name for the signed PDF.</p>
				</div>

				<label class="flex flex-col gap-1.5 text-sm">
					<span>Signing as</span>
					<select
						class="h-11 rounded-md border border-border px-2"
						value={effectiveSignerRole}
						disabled={Boolean(requestedRole && roleOptions.includes(requestedRole))}
						onchange={(event) => (signerRole = event.currentTarget.value)}
					>
						{#each roleOptions as role (role)}<option value={role}>{role}</option>{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1.5 text-sm">
					<span>Your full name</span>
					<Input bind:value={signerName} placeholder="John Doe" required class="h-11" />
				</label>

				<label class="flex flex-col gap-1.5 text-sm">
					<span>Email address</span>
					<Input bind:value={signerEmail} type="email" placeholder="john@company.com" class="h-11" />
				</label>

				<Button type="submit" disabled={isCreating} loading={isCreating} loadingText="Starting..." class="h-11 w-full">
					Start signing
				</Button>
			</form>
		</main>
	</div>
{/if}
