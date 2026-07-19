<script lang="ts">
	import { enhance } from "$app/forms";
	import ArrowLeft from "phosphor-svelte/lib/ArrowLeft";
	import CheckCircle from "phosphor-svelte/lib/CheckCircle";
	import Moon from "phosphor-svelte/lib/Moon";
	import Sun from "phosphor-svelte/lib/Sun";
	import UploadSimple from "phosphor-svelte/lib/UploadSimple";
	import { mode, toggleMode } from "mode-watcher";
	import Button from "$lib/components/ui/button.svelte";
	import SiteShell from "$lib/components/marketing/site-shell.svelte";
	import { cn } from "$lib/utils";

	let { data, form } = $props();
	let fileName = $state("");
	let checking = $state(false);
	const isDark = $derived(mode.current === "dark");

	const failureCopy = $derived.by(() => {
		if (!form?.result) return null;
		if (form.result === "document_mismatch")
			return "This file does not match the finalized PDF recorded by SleekSign.";
		if (form.result === "revoked")
			return "This integrity receipt has been revoked by its issuing workspace.";
		if (
			form.result === "invalid_signature" ||
			form.result === "invalid_receipt" ||
			form.result === "invalid_audit_chain"
		)
			return "The integrity receipt could not be authenticated.";
		if (form.result === "file_too_large")
			return "The PDF must be 25 MB or smaller.";
		if (form.result === "invalid_pdf") return "Choose a valid PDF document.";
		if (form.result === "missing_file")
			return "Choose the signed PDF you want to check.";
		if (form.result === "unavailable")
			return "Verification is temporarily unavailable. The document has not been marked invalid.";
		if (form.result === "not_found")
			return "No SleekSign integrity receipt was found for this ID.";
		return null;
	});

	const receiptActive = $derived(data.found && data.status === "active");
</script>

<svelte:head>
	<title>Document verification - SleekSign</title>
	<meta
		name="description"
		content="Verify the integrity of a finalized SleekSign PDF."
	/>
</svelte:head>

<SiteShell>
	<section class="mx-auto w-[90%] max-w-lg pt-28 pb-16 sm:pb-20">
		<div class="flex flex-col items-center text-center">
			<button
				type="button"
				class="mb-4 grid size-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
				aria-label={isDark ? "Use light theme" : "Use dark theme"}
				title={isDark ? "Use light theme" : "Use dark theme"}
				onclick={toggleMode}
			>
				{#if isDark}
					<Sun class="size-3.5" aria-hidden="true" />
				{:else}
					<Moon class="size-3.5" aria-hidden="true" />
				{/if}
			</button>

			<a
				href="/"
				class="mb-8 font-cursive text-xl font-semibold leading-none text-foreground lg:text-4xl"
			>
				SleekSign
			</a>

			<a
				href="/verify"
				class="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-orange-500"
			>
				<ArrowLeft class="size-3.5" aria-hidden="true" />
				Check another ID
			</a>

			<p
				class="text-[9px] font-medium tracking-[0.2em] text-muted-foreground uppercase"
			>
				Document integrity
			</p>
			<h1
				class="mt-4 max-w-xl text-[36px] font-light leading-[1.05] tracking-tight text-foreground sm:text-[48px]"
			>
				Verify the
				<span class="font-cursive text-orange-500"> exact </span>
				PDF.
			</h1>
			<p
				class="mt-5 max-w-md text-[14px] font-light leading-[1.8] text-muted-foreground"
			>
				SleekSign checks the complete file, the sealed audit chain, and the
				signature produced by Google Cloud KMS. The verification ID alone is not
				proof.
			</p>
		</div>

		<div
			class="mt-10 overflow-hidden rounded-2xl border border-border/70 bg-card"
		>
			<div
				class="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4"
			>
				<div class="min-w-0">
					<p
						class="text-[9px] font-medium tracking-[0.16em] text-muted-foreground uppercase"
					>
						Verification ID
					</p>
					<p
						class="mt-1 break-all font-mono text-xs font-medium text-foreground"
					>
						{data.verificationId}
					</p>
				</div>
				<span
					class={cn(
						"rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[0.1em] uppercase",
						receiptActive
							? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
							: "border-destructive/30 bg-destructive/10 text-destructive",
					)}
				>
					{receiptActive ? "Receipt located" : "Receipt unavailable"}
				</span>
			</div>

			{#if !data.found}
				<div class="p-5 sm:p-6">
					<h2 class="text-base font-medium tracking-tight text-foreground">
						No matching receipt
					</h2>
					<p class="mt-2 text-sm font-light leading-6 text-muted-foreground">
						Check the ID printed along the bottom edge of the document.
					</p>
				</div>
			{:else if form?.result === "valid"}
				<div class="p-5 sm:p-6">
					<div
						class="grid size-10 place-items-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500"
					>
						<CheckCircle class="size-5" weight="bold" aria-hidden="true" />
					</div>
					<p
						class="mt-5 text-[9px] font-medium tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-400"
					>
						Authentic document
					</p>
					<h2 class="mt-2 text-xl font-medium tracking-tight text-foreground">
						{form.documentName}
					</h2>
					<p class="mt-3 text-sm font-light leading-6 text-muted-foreground">
						The uploaded bytes match the finalized SleekSign record, and its
						signed manifest and audit chain are intact.
					</p>
					<dl
						class="mt-6 grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-2"
					>
						<div class="bg-card p-3.5">
							<dt
								class="text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase"
							>
								Finalized
							</dt>
							<dd class="mt-1 text-xs text-foreground">
								{new Date(form.finalizedAt).toLocaleString()}
							</dd>
						</div>
						<div class="bg-card p-3.5">
							<dt
								class="text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase"
							>
								Sealed audit events
							</dt>
							<dd class="mt-1 text-xs text-foreground">
								{form.auditEventCount}
							</dd>
						</div>
						<div class="bg-card p-3.5">
							<dt
								class="text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase"
							>
								Signature
							</dt>
							<dd class="mt-1 text-xs text-foreground">
								{form.signatureAlgorithm}
							</dd>
						</div>
						<div class="bg-card p-3.5">
							<dt
								class="text-[9px] font-medium tracking-[0.14em] text-muted-foreground uppercase"
							>
								Key fingerprint
							</dt>
							<dd class="mt-1 font-mono text-xs text-foreground">
								{form.keyFingerprint}...
							</dd>
						</div>
					</dl>
				</div>
			{:else}
				<form
					method="POST"
					enctype="multipart/form-data"
					use:enhance={() => {
						checking = true;
						return async ({ update }) => {
							await update({ reset: false });
							checking = false;
						};
					}}
					class="p-5 sm:p-6"
				>
					<label
						class="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center transition-colors hover:border-foreground/30 hover:bg-muted/70"
					>
						<input
							type="file"
							name="document"
							accept="application/pdf,.pdf"
							required
							class="sr-only"
							onchange={(event) =>
								(fileName = event.currentTarget.files?.[0]?.name || "")}
						/>
						<span
							class="grid size-9 place-items-center rounded-full border border-border bg-card text-foreground"
						>
							<UploadSimple class="size-4" aria-hidden="true" />
						</span>
						<span class="mt-3 text-sm font-medium text-foreground">
							{fileName || "Choose the finalized PDF"}
						</span>
						<span class="mt-1 text-xs font-light text-muted-foreground">
							PDF only, up to 25 MB
						</span>
					</label>
					{#if failureCopy}
						<div
							class="mt-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm leading-6 text-destructive"
						>
							{failureCopy}
						</div>
					{/if}
					<Button
						type="submit"
						loading={checking}
						loadingText="Checking cryptographic receipt..."
						class="mt-3 w-full"
					>
						Verify this document
					</Button>
				</form>
			{/if}
		</div>

		<p class="mt-5 text-center text-xs font-light leading-5 text-muted-foreground">
			Personal signer details and the full chain of custody are available only
			to authorized members of the issuing workspace.
		</p>
	</section>
</SiteShell>
