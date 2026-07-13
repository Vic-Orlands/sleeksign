<script lang="ts">
	import { format } from "date-fns";
	import {
		CalendarBlankIcon,
		CheckCircleIcon,
		CheckIcon,
		CheckSquareIcon,
		CaretDownIcon,
		PenIcon,
		TextTIcon,
		XIcon,
	} from "phosphor-svelte";
	import PdfCanvasViewer from "$lib/components/pdf/PdfCanvasViewer.svelte";
	import SignatureValue from "$lib/components/signature/SignatureValue.svelte";
	import type { DocumentRecord } from "$lib/components/docs/types";
	import Button from "$lib/components/ui/button.svelte";
	import type { Field } from "$lib/field-utils";
	import { valueIsComplete } from "$lib/field-utils";
	import { cn } from "$lib/utils";

	let {
		document: doc,
		onClose,
	}: {
		document: DocumentRecord;
		onClose: () => void;
	} = $props();

	type PreviewValueMap = Record<string, string>;

	const emptyFieldTones = {
		signature:
			"border-blue-500/70 bg-blue-50/95 text-zinc-950 hover:bg-blue-100/90 dark:bg-blue-200/90 dark:text-zinc-950 dark:hover:bg-blue-300/90",
		text: "border-emerald-500/70 bg-emerald-50/95 text-zinc-950 hover:bg-emerald-100/90 dark:bg-emerald-200/90 dark:text-zinc-950 dark:hover:bg-emerald-300/90",
		date: "border-amber-500/70 bg-amber-50/95 text-zinc-950 hover:bg-amber-100/90 dark:bg-amber-200/90 dark:text-zinc-950 dark:hover:bg-amber-300/90",
		checkbox:
			"border-violet-500/70 bg-violet-50/95 text-zinc-950 hover:bg-violet-100/90 dark:bg-violet-200/90 dark:text-zinc-950 dark:hover:bg-violet-300/90",
	} as const;

	const completedFieldTones = {
		signature:
			"border-blue-600 bg-blue-50/95 text-zinc-950 dark:border-blue-400 dark:bg-blue-200/90 dark:text-zinc-950",
		text: "border-emerald-600 bg-emerald-50/95 text-zinc-950 dark:border-emerald-400 dark:bg-emerald-200/90 dark:text-zinc-950",
		date: "border-amber-600 bg-amber-50/95 text-zinc-950 dark:border-amber-400 dark:bg-amber-200/90 dark:text-zinc-950",
		checkbox:
			"border-violet-600 bg-violet-50/95 text-zinc-950 dark:border-violet-400 dark:bg-violet-200/90 dark:text-zinc-950",
	} as const;

	let values = $state<PreviewValueMap>({});

	const fields = $derived(doc.fields || []);
	const requiredFields = $derived(fields.filter((field) => field.required));
	const completedCount = $derived(
		requiredFields.filter((field) => valueIsComplete(values[field.id])).length,
	);
	const allFieldsComplete = $derived(
		requiredFields.every((field) => valueIsComplete(values[field.id])),
	);
	const nextField = $derived(
		requiredFields.find((field) => !valueIsComplete(values[field.id])),
	);

	function fillPreviewValue(field: Field) {
		if (field.type === "checkbox") {
			values = {
				...values,
				[field.id]: values[field.id] === "true" ? "false" : "true",
			};
			return;
		}
		if (field.type === "date") {
			values = { ...values, [field.id]: format(new Date(), "yyyy-MM-dd") };
			return;
		}
		if (field.type === "signature") {
			values = { ...values, [field.id]: "Alex Morgan" };
			return;
		}
		values = { ...values, [field.id]: "Preview response" };
	}

	function scrollToField(field?: Field) {
		if (!field) return;
		window.setTimeout(() => {
			window.document
				.querySelector(`[data-review-field-id="${field.id}"]`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 0);
	}

	const fieldIcons = {
		signature: PenIcon,
		text: TextTIcon,
		date: CalendarBlankIcon,
		checkbox: CheckSquareIcon,
	} as const;
</script>

{#snippet renderOverlay(pageIndex: number, metrics: { width: number; height: number; scale: number })}
	{#each fields.filter((field) => field.page === pageIndex) as field (field.id)}
		{@const value = values[field.id]}
		{@const isComplete = valueIsComplete(value)}
		{@const Icon = fieldIcons[field.type]}
		<button
			type="button"
			data-review-field-id={field.id}
			onclick={(event) => {
				event.stopPropagation();
				fillPreviewValue(field);
			}}
			style:left={`${(field.x / 100) * metrics.width}px`}
			style:top={`${(field.y / 100) * metrics.height}px`}
			style:width={`${(field.width / 100) * metrics.width}px`}
			style:height={`${(field.height / 100) * metrics.height}px`}
			class={cn(
				"absolute flex items-center justify-center border text-center transition",
				isComplete ? completedFieldTones[field.type] : emptyFieldTones[field.type],
			)}
		>
			{#if isComplete}
				{#if field.type === "checkbox"}
					<CheckIcon class="size-4" />
				{:else if field.type === "signature"}
					<SignatureValue {value} class="h-full w-full px-2 py-1" />
				{:else}
					<span class="truncate px-2 text-xs font-semibold">{value}</span>
				{/if}
			{:else}
				<span
					class="flex items-center gap-1 px-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
				>
					<Icon class="size-3" />
					{field.type}
				</span>
			{/if}
		</button>
	{/each}
{/snippet}

<div class="grid h-full grid-rows-[auto_minmax(0,1fr)] bg-(--paper)">
	<header
		class="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background px-5 py-2"
	>
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<span
					class="flex size-6 items-center justify-center bg-primary font-mono text-[10px] font-bold text-primary-foreground"
				>
					S
				</span>
				<h2 class="font-mono text-xs font-semibold uppercase tracking-widest">Signer Review</h2>
				<span
					class="rounded-none border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest"
				>
					Preview
				</span>
			</div>
			<p class="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
				{doc.name}
			</p>
		</div>
		<div class="flex items-center gap-2">
			{#if !allFieldsComplete}
				<Button
					variant="outline"
					class="hidden gap-2 md:inline-flex"
					onclick={() => scrollToField(nextField)}
				>
					Next field
					<CaretDownIcon class="size-4" />
				</Button>
			{/if}
			<Button disabled={!allFieldsComplete} class="gap-2">
				<CheckIcon class="size-4" />
				{allFieldsComplete ? "Ready" : `${completedCount}/${requiredFields.length} complete`}
			</Button>
			<Button variant="ghost" size="icon" onclick={onClose} aria-label="Close review">
				<XIcon class="size-4" />
			</Button>
		</div>
	</header>

	<main class="grid min-h-0 md:grid-cols-[minmax(0,1fr)_280px]">
		<section class="sleek-grid min-h-0 overflow-auto bg-zinc-100 px-6 py-8 dark:bg-[#121214] md:px-10">
			{#if doc.fileUrl}
				<PdfCanvasViewer
					fileUrl={doc.fileUrl}
					class="mx-auto w-full max-w-[840px]"
					pageClassName="relative border-t-8 border-zinc-300 bg-white ring-1 ring-black/10 dark:border-[#3f3f46]"
					{renderOverlay}
				/>
			{:else}
				<div
					class="mx-auto flex min-h-96 w-full max-w-[840px] items-center justify-center border border-dashed border-border bg-background text-sm text-muted-foreground"
				>
					PDF is still uploading…
				</div>
			{/if}
		</section>

		<aside class="hidden min-h-0 border-l border-border bg-card p-5 md:block">
			<h3 class="font-mono text-[10px] font-semibold uppercase tracking-widest">Required fields</h3>
			<div class="mt-4 space-y-2">
				{#each fields as field, index (field.id)}
					{@const complete = !field.required || valueIsComplete(values[field.id])}
					{@const Icon = fieldIcons[field.type]}
					<button
						type="button"
						onclick={() => scrollToField(field)}
						class="flex w-full items-center justify-between border border-border bg-background px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest hover:bg-muted/50"
					>
						<span class="flex items-center gap-2 capitalize">
							<Icon class="size-4 text-muted-foreground" />
							{index + 1}. {field.type}
							{#if !field.required}
								<span
									class="border border-border px-1 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground"
								>
									Optional
								</span>
							{/if}
						</span>
						{#if complete}
							<CheckCircleIcon class="size-4 text-emerald-600" />
						{:else}
							<span class="size-2 bg-amber-500"></span>
						{/if}
					</button>
				{/each}
			</div>
		</aside>
	</main>
</div>
