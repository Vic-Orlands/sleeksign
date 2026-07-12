<script lang="ts">
	import { page } from "$app/stores";
	import { format } from "date-fns";
	import { toast } from "svelte-sonner";
	import PdfCanvasViewer from "$lib/components/pdf/PdfCanvasViewer.svelte";
	import SignatureMaker from "$lib/components/signature/SignatureMaker.svelte";
	import SignatureValue from "$lib/components/signature/SignatureValue.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import { valueIsComplete, type Field } from "$lib/field-utils";

	type SignatureRecord = { fieldId: string; value: string };
	type SessionRecord = {
		id: string;
		status: "pending" | "completed";
		signerName?: string | null;
		signerEmail?: string | null;
		signerRole?: string | null;
		document: { name: string; fileUrl: string; fields: Field[] };
		signatures?: SignatureRecord[];
	};

	let session = $state<SessionRecord | null>(null);
	let loadError = $state<string | null>(null);
	let isLoading = $state(true);
	let isFinalizing = $state(false);
	let selectedField = $state<Field | null>(null);
	let signatures = $state<Record<string, string>>({});
	let isMakerOpen = $state(false);
	let finalPdfUrl = $state<string | null>(null);

	const sessionId = $derived($page.params.id);

	async function loadSession(id: string) {
		isLoading = true;
		loadError = null;
		try {
			const res = await fetch(`/api/sessions?sessionId=${id}`);
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			session = data as SessionRecord;
		} catch (error) {
			loadError = error instanceof Error ? error.message : "Session not found";
			session = null;
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		const id = sessionId;
		if (id) void loadSession(id);
	});

	const savedSignatures = $derived(
		Object.fromEntries(session?.signatures?.map((item) => [item.fieldId, item.value]) || []),
	);
	const currentSignatures = $derived({ ...savedSignatures, ...signatures });
	const fields = $derived(
		(session?.document?.fields || []).filter((field) =>
			session?.signerRole ? field.assigneeRole === session.signerRole : true,
		),
	);
	const requiredFields = $derived(fields.filter((field) => field.required));
	const completedCount = $derived(
		requiredFields.filter((field) => valueIsComplete(currentSignatures[field.id])).length,
	);
	const allFieldsSigned = $derived(
		requiredFields.every((field) => valueIsComplete(currentSignatures[field.id])),
	);

	async function updateSignature(fieldId: string, value: string) {
		signatures = { ...signatures, [fieldId]: value };
		await fetch("/api/sessions", {
			method: "PATCH",
			body: JSON.stringify({ sessionId: sessionId, fieldId, value }),
		});
		toast.success("Field saved");
	}

	async function handleFieldClick(field: Field) {
		if (session?.status === "completed") return;
		if (field.type === "date") {
			await updateSignature(field.id, format(new Date(), "yyyy-MM-dd"));
			return;
		}
		if (field.type === "checkbox") {
			await updateSignature(field.id, currentSignatures[field.id] === "true" ? "false" : "true");
			return;
		}
		selectedField = field;
		isMakerOpen = true;
	}

	async function finalize() {
		isFinalizing = true;
		try {
			const res = await fetch("/api/finalize", {
				method: "POST",
				body: JSON.stringify({ sessionId: sessionId, }),
			});
			if (!res.ok) throw new Error("Finalize failed");
			const data = await res.json();
			finalPdfUrl = data.url;
			toast.success("Document finalized");
		} catch {
			toast.error("Failed to finalize document");
		} finally {
			isFinalizing = false;
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
{:else if loadError || !session}
	<div class="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
		<h1 class="text-xl font-semibold">Unable to open this document</h1>
		<p class="max-w-md text-sm text-muted-foreground">{loadError || "Session not found"}</p>
	</div>
{:else if finalPdfUrl}
	<div class="flex min-h-screen items-center justify-center bg-(--paper) p-6">
		<div class="w-full max-w-md border border-border bg-background p-8 text-center">
			<h1 class="font-mono text-xs font-semibold uppercase tracking-widest">Document completed</h1>
			<p class="mt-2 text-sm text-muted-foreground">Your signed PDF is ready.</p>
			<Button class="mt-6 w-full" onclick={() => window.open(finalPdfUrl!, "_blank")}>Download signed PDF</Button>
		</div>
	</div>
{:else}
	<div class="flex h-screen flex-col bg-(--paper)">
		<header class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-5">
			<div class="min-w-0">
				<h1 class="text-lg font-cursive">SleekSign</h1>
				<p class="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					{session.document.name}
				</p>
			</div>
			<Button disabled={!allFieldsSigned} loading={isFinalizing} loadingText="Completing..." onclick={finalize}>
				{allFieldsSigned ? "Complete" : `${completedCount}/${requiredFields.length} complete`}
			</Button>
		</header>

		<main class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_280px]">
			<section class="sleek-grid min-h-0 overflow-auto bg-zinc-100 px-6 py-8 dark:bg-[#121214]">
				<PdfCanvasViewer
					fileUrl={session.document.fileUrl}
					class="mx-auto w-full max-w-[840px]"
					pageClassName="relative border-t-8 border-zinc-300 bg-white ring-1 ring-black/10"
				>
					{#snippet renderOverlay(pageIndex, metrics)}
						{#each fields.filter((field) => field.page === pageIndex) as field (field.id)}
							{@const value = currentSignatures[field.id]}
							{@const complete = valueIsComplete(value)}
							<button
								type="button"
								data-field-id={field.id}
								class="absolute flex items-center justify-center border text-center transition {complete
									? 'border-emerald-600 bg-emerald-50/95'
									: 'border-blue-500/70 bg-blue-50/95'}"
								style:left="{(field.x / 100) * metrics.width}px"
								style:top="{(field.y / 100) * metrics.height}px"
								style:width="{(field.width / 100) * metrics.width}px"
								style:height="{(field.height / 100) * metrics.height}px"
								onclick={(event) => {
									event.stopPropagation();
									void handleFieldClick(field);
								}}
							>
								{#if complete}
									{#if field.type === "signature"}
										<SignatureValue {value} class="h-full w-full px-2 py-1" />
									{:else}
										<span class="truncate px-2 text-xs font-semibold">{value}</span>
									{/if}
								{:else}
									<span class="px-1 font-mono text-[10px] font-semibold uppercase">{field.type}</span>
								{/if}
							</button>
						{/each}
					{/snippet}
				</PdfCanvasViewer>
			</section>

			<aside class="hidden min-h-0 border-l border-border bg-card p-5 md:block">
				<h2 class="font-mono text-[10px] font-semibold uppercase tracking-widest">Required fields</h2>
				<div class="mt-4 space-y-2">
					{#each fields as field, index (field.id)}
						{@const complete = !field.required || valueIsComplete(currentSignatures[field.id])}
						<button
							type="button"
							class="flex w-full items-center justify-between border border-border bg-background px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest hover:bg-muted/50"
							onclick={() =>
								document.querySelector(`[data-field-id="${field.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
						>
							<span>{index + 1}. {field.type}</span>
							<span>{complete ? "✓" : "•"}</span>
						</button>
					{/each}
				</div>
			</aside>
		</main>
	</div>
{/if}

<SignatureMaker
	open={isMakerOpen}
	onClose={() => (isMakerOpen = false)}
	onConfirm={async (value) => {
		if (!selectedField) return;
		await updateSignature(selectedField.id, value);
		isMakerOpen = false;
	}}
	type={selectedField?.type === "text" ? "text" : "signature"}
	defaultValue={currentSignatures[selectedField?.id || ""] || (selectedField?.type === "signature" ? session?.signerName || "" : "")}
	textSuggestions={[
		...(session?.signerName ? [{ label: "Full name", value: session.signerName }] : []),
		...(session?.signerEmail ? [{ label: "Email address", value: session.signerEmail }] : []),
	]}
/>
