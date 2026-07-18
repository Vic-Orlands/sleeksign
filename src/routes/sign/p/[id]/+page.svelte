<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import { toast } from "svelte-sonner";
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";

	type PublicDocument = { id: string; name: string; signerRoles: string[] };
	type PublicPacket = {
		id: string;
		requireOtp?: boolean;
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

	let step = $state<"details" | "otp">("details");
	let pendingPacketUrl = $state<string | null>(null);
	let pendingCopyId = $state<string | null>(null);
	let otpSent = $state(false);
	let otpCode = $state("");
	let otpBusy = $state(false);

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

	async function sendOtp() {
		if (!signerName.trim()) {
			toast.error("Enter your full name");
			return;
		}
		const email = signerEmail.trim();
		if (!email) {
			toast.error("Enter your email address");
			return;
		}
		if (!packetId) return;

		otpBusy = true;
		try {
			const res = await fetch(`/api/public-packets/${packetId}/otp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "send",
					roleName: effectiveSignerRole,
					copyId: pendingCopyId,
					signerName: signerName.trim(),
					recipientEmail: email,
				}),
			});
			if (!res.ok) throw new Error("Failed to send code");
			otpSent = true;
			toast.success("Verification code sent");
		} catch {
			toast.error("Unable to send verification code");
		} finally {
			otpBusy = false;
		}
	}

	async function verifyOtp() {
		if (!otpCode.trim()) {
			toast.error("Enter the verification code");
			return;
		}
		if (!packetId || !pendingPacketUrl) return;

		otpBusy = true;
		try {
			const res = await fetch(`/api/public-packets/${packetId}/otp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "verify",
					roleName: effectiveSignerRole,
					copyId: pendingCopyId,
					recipientEmail: signerEmail.trim(),
					code: otpCode.trim(),
				}),
			});
			if (!res.ok) throw new Error("Invalid code");
			toast.success("Verified");
			await goto(pendingPacketUrl);
		} catch {
			toast.error("Verification failed");
			otpBusy = false;
		}
	}

	async function startSigning(event: SubmitEvent) {
		event.preventDefault();
		if (!signerName.trim()) {
			toast.error("Enter your full name");
			return;
		}
		if (!signerEmail.trim()) {
			toast.error("Enter your email address");
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
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						packetId,
						roleName: effectiveSignerRole,
						signerName: signerName.trim(),
						signerEmail: signerEmail.trim(),
					}),
				});
				const copyData = await copyRes.json();
				if (!copyRes.ok) {
					throw new Error(copyData.error || "Failed to prepare signing copy");
				}
				const nextUrl = `/sign/packet/${packetId}?role=${encodeURIComponent(effectiveSignerRole)}${
					copyData.copyId ? `&copyId=${encodeURIComponent(copyData.copyId)}` : ""
				}`;

				if (packet?.requireOtp) {
					if (!signerEmail.trim()) {
						toast.error("Email is required for verification");
						isCreating = false;
						return;
					}
					pendingPacketUrl = nextUrl;
					pendingCopyId = copyData.copyId || null;
					otpCode = "";
					otpSent = false;
					step = "otp";
					isCreating = false;
					void sendOtp();
					return;
				}

				await goto(nextUrl);
				return;
			}

			const res = await fetch("/api/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					documentId,
					signerName: signerName.trim(),
					signerEmail: signerEmail.trim(),
					signerRole: effectiveSignerRole,
				}),
			});
			const data = await res.json();
			if (!res.ok || !data.sessionId) throw new Error(data.error || "No session created");
			await goto(`/sign/${data.sessionId}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to initialize signing session");
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

			{#if step === "otp"}
				<form
					class="flex flex-col gap-5 p-8"
					onsubmit={(event) => {
						event.preventDefault();
						void (otpSent ? verifyOtp() : sendOtp());
					}}
				>
					<div>
						<h2 class="font-mono text-xs font-semibold uppercase tracking-widest">Verify your email</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							Enter the one-time code we sent to {signerEmail.trim() || "your email"} to continue as
							{effectiveSignerRole}.
						</p>
					</div>

					<label class="flex flex-col gap-1.5 text-sm">
						<span>Your full name</span>
						<Input bind:value={signerName} autocomplete="name" required class="h-11" />
					</label>

					<label class="flex flex-col gap-1.5 text-sm">
						<span>Email address</span>
						<Input bind:value={signerEmail} type="email" autocomplete="email" placeholder="john@company.com" required class="h-11" />
					</label>

					{#if otpSent}
						<label class="flex flex-col gap-1.5 text-sm">
							<span>Verification code</span>
							<Input bind:value={otpCode} placeholder="Enter code" class="h-11" autocomplete="one-time-code" />
						</label>
					{/if}

					<div class="flex flex-col items-center gap-2">
						<Button type="submit" disabled={otpBusy} loading={otpBusy} class="w-full">
							{otpSent ? "Verify OTP" : "Send OTP"}
						</Button>
						{#if otpSent}
							<button
								type="button"
								class="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
								disabled={otpBusy}
								onclick={() => void sendOtp()}
							>
								Resend OTP
							</button>
						{/if}
						<button
							type="button"
							class="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
							disabled={otpBusy}
							onclick={() => {
								step = "details";
								otpCode = "";
								otpSent = false;
								pendingPacketUrl = null;
								pendingCopyId = null;
							}}
						>
							Back to details
						</button>
					</div>
				</form>
			{:else}
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
						<Input
							bind:value={signerEmail}
							type="email"
							autocomplete="email"
							placeholder="john@company.com"
							required
							class="h-11"
						/>
					</label>

					<Button type="submit" disabled={isCreating} loading={isCreating} loadingText="Starting..." class="w-full">
						Start signing
					</Button>
				</form>
			{/if}
		</main>
	</div>
{/if}
