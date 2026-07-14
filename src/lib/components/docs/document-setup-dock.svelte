<script lang="ts">
	import { toast } from "svelte-sonner";
	import FieldInspector from "$lib/components/docs/field-inspector.svelte";
	import FieldPalette, {
		type FieldToolType,
	} from "$lib/components/docs/field-palette.svelte";
	import SetupField from "$lib/components/docs/setup-field.svelte";
	import type { DocumentRecord } from "$lib/components/docs/types";
	import PdfCanvasViewer from "$lib/components/pdf/PdfCanvasViewer.svelte";
	import Button from "$lib/components/ui/button.svelte";
	import { postFormAction } from "$lib/form-action";
	import {
		type Field,
		type RoleConfig,
		DEFAULT_ROLE_CONFIGS,
		UNASSIGNED_ROLE,
		clampField,
		fieldDefaults,
		normalizeRoleConfigs,
	} from "$lib/field-utils";
	import { cn } from "$lib/utils";

	let {
		document: doc,
		onFieldsChange,
		fullHeight = false,
	}: {
		document: DocumentRecord;
		onFieldsChange?: (documentId: string, fields: Field[]) => void;
		fullHeight?: boolean;
	} = $props();

	function safeRoleConfigs(value: unknown): RoleConfig[] {
		try {
			return normalizeRoleConfigs(value);
		} catch {
			return DEFAULT_ROLE_CONFIGS;
		}
	}

	let fields = $state<Field[]>([]);
	let roleConfigs = $state<RoleConfig[]>(DEFAULT_ROLE_CONFIGS);
	let selectedType = $state<FieldToolType>("select");
	let selectedFieldId = $state<string | null>(null);
	let isSaving = $state(false);
	let zoom = $state(100);
	let pageCount = $state(0);
	let currentPage = $state(0);
	let fitMode = $state<"width" | "page">("width");
	let viewerEl = $state<HTMLDivElement | null>(null);
	let syncedDocumentId = $state("");

	$effect(() => {
		if (syncedDocumentId === doc.id) return;
		syncedDocumentId = doc.id;
		fields = doc.fields || [];
		roleConfigs = safeRoleConfigs(doc.roleConfigs);
		selectedFieldId = doc.fields?.[0]?.id || null;
	});

	const selectedField = $derived(fields.find((field) => field.id === selectedFieldId));
	const fieldsByPage = $derived.by(() => {
		const pageMap = new Map<number, Field[]>();
		for (const field of fields) {
			const pageFields = pageMap.get(field.page);
			if (pageFields) pageFields.push(field);
			else pageMap.set(field.page, [field]);
		}
		return pageMap;
	});
	const fieldCounts = $derived({
		signature: fields.filter((f) => f.type === "signature").length,
		text: fields.filter((f) => f.type === "text").length,
		date: fields.filter((f) => f.type === "date").length,
		checkbox: fields.filter((f) => f.type === "checkbox").length,
	});

	const fieldToneMap = {
		signature: "border-blue-600/80 bg-blue-100/90 text-blue-800",
		text: "border-emerald-600/80 bg-emerald-100/90 text-emerald-800",
		date: "border-amber-600/80 bg-amber-100/90 text-amber-900",
		checkbox: "border-violet-600/80 bg-violet-100/90 text-violet-800",
	} as const;

	const fieldLabelToneMap = {
		signature: "bg-blue-600 text-white",
		text: "bg-emerald-600 text-white",
		date: "bg-amber-500 text-black",
		checkbox: "bg-violet-600 text-white",
	} as const;

	function updateLocalFields(nextFields: Field[]) {
		fields = nextFields;
		onFieldsChange?.(doc.id, nextFields);
	}

	function selectField(fieldId: string) {
		if (selectedFieldId === fieldId) return;
		selectedFieldId = fieldId;
	}

	function handleDocumentLoad(count: number) {
		pageCount = count;
		if (currentPage >= count) currentPage = Math.max(0, count - 1);
	}

	function handleVisiblePageChange(pageIndex: number) {
		if (currentPage === pageIndex) return;
		currentPage = pageIndex;
	}

	function bumpZoom(delta: number) {
		zoom = Math.min(150, Math.max(50, zoom + delta));
	}

	function goToPage(pageIndex: number) {
		const target = Math.max(0, Math.min(pageCount - 1, pageIndex));
		currentPage = target;
		viewerEl
			?.querySelector(`[data-pdf-page="${target}"]`)
			?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	async function addField(page: number, point: { x: number; y: number }) {
		if (selectedType === "select") return;

		const defaults = fieldDefaults[selectedType];
		const fieldId = crypto.randomUUID();
		const draft = clampField({
			id: fieldId,
			type: selectedType,
			page,
			x: point.x,
			y: point.y,
			width: defaults.width,
			height: defaults.height,
			required: true,
			assigneeRole: UNASSIGNED_ROLE,
		}) as Field;

		const previousSelection = selectedFieldId;
		updateLocalFields([...fields, draft]);
		selectedFieldId = fieldId;

		try {
			await postFormAction(
				"addField",
				{
					id: draft.id,
					type: draft.type,
					page: draft.page,
					x: draft.x,
					y: draft.y,
					width: draft.width,
					height: draft.height,
					required: draft.required,
					assigneeRole: draft.assigneeRole,
				},
				{ apply: false },
			);
		} catch (error) {
			updateLocalFields(fields.filter((f) => f.id !== fieldId));
			selectedFieldId = previousSelection;
			toast.error(error instanceof Error ? error.message : "Failed to add field");
		}
	}

	async function persistField(fieldId: string, updates: Partial<Field>) {
		const current = fields.find((item) => item.id === fieldId);
		if (!current) return;

		const nextField = clampField({ ...current, ...updates }) as Field;
		const unchanged =
			nextField.x === current.x &&
			nextField.y === current.y &&
			nextField.width === current.width &&
			nextField.height === current.height &&
			nextField.required === current.required &&
			nextField.assigneeRole === current.assigneeRole;
		if (unchanged) return;

		const nextFields = fields.map((field) => (field.id === fieldId ? nextField : field));
		updateLocalFields(nextFields);
		selectedFieldId = fieldId;

		isSaving = true;
		try {
			await postFormAction(
				"updateField",
				{
					fieldId,
					x: nextField.x,
					y: nextField.y,
					width: nextField.width,
					height: nextField.height,
					required: nextField.required,
					assigneeRole: nextField.assigneeRole,
				},
				{ apply: false },
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to update field");
		} finally {
			isSaving = false;
		}
	}

	async function persistRoleConfigs(nextRoleConfigs: RoleConfig[]) {
		const normalized = normalizeRoleConfigs(nextRoleConfigs);
		const roleNames = new Set(normalized.map((role) => role.name));
		const nextFields = fields.map((field) =>
			!field.assigneeRole || roleNames.has(field.assigneeRole)
				? field
				: { ...field, assigneeRole: UNASSIGNED_ROLE },
		);

		roleConfigs = normalized;
		updateLocalFields(nextFields);

		isSaving = true;
		try {
			await postFormAction(
				"saveRoleConfigs",
				{ roleConfigs: JSON.stringify(normalized) },
				{ apply: false },
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save roles");
		} finally {
			isSaving = false;
		}
	}

	async function deleteField(fieldId: string) {
		const previousFields = fields;
		const previousSelection = selectedFieldId;
		const nextFields = fields.filter((field) => field.id !== fieldId);
		updateLocalFields(nextFields);
		if (selectedFieldId === fieldId) selectedFieldId = nextFields[0]?.id || null;

		try {
			await postFormAction("deleteField", { fieldId }, { apply: false });
		} catch (error) {
			updateLocalFields(previousFields);
			selectedFieldId = previousSelection;
			toast.error(error instanceof Error ? error.message : "Failed to remove field");
		}
	}
</script>

{#snippet renderOverlay(pageIndex: number, metrics: import("$lib/components/pdf/PdfCanvasViewer.svelte").PageMetrics)}
	{#each fieldsByPage.get(pageIndex) || [] as field, index (field.id)}
		<SetupField
			{field}
			{index}
			{metrics}
			selected={selectedFieldId === field.id}
			toneClass={fieldToneMap[field.type]}
			labelClass={fieldLabelToneMap[field.type]}
			onSelect={() => selectField(field.id)}
			onPersist={(updates) => persistField(field.id, updates)}
			onDelete={() => deleteField(field.id)}
		/>
	{/each}
{/snippet}

<div
	class={cn(
		"grid min-h-0 overflow-hidden border border-border bg-card lg:grid-cols-[240px_minmax(0,1fr)_340px]",
		fullHeight ? "h-full" : "h-[32rem]",
	)}
>
	<aside class="min-h-0 border-b border-border bg-background p-3 lg:border-b-0 lg:border-r">
		<div class="flex h-full flex-col gap-3 sm:flex-row sm:items-end lg:flex-col lg:items-stretch">
			<div class="sm:w-44 lg:w-auto">
				<h3 class="font-mono text-[10px] font-semibold">Add Field</h3>
				<p class="mt-1 text-[11px] leading-4 text-muted-foreground">
					Select a field type, then click the PDF to place it.
				</p>
			</div>
			<FieldPalette {selectedType} {fieldCounts} onSelectType={(type) => (selectedType = type)} />
		</div>
	</aside>

	<section class="grid min-h-[27rem] grid-rows-[auto_minmax(0,1fr)_auto] lg:min-h-0">
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
			<div class="flex items-center gap-1">
				<Button variant="ghost" size="sm" class="h-8 w-8 px-0" onclick={() => bumpZoom(-10)}>
					−
				</Button>
				<Button variant="ghost" size="sm" class="h-8 w-8 px-0" onclick={() => bumpZoom(10)}>
					+
				</Button>
				<select
					class="h-8 rounded-md border border-border bg-background px-2 text-xs"
					value={`${zoom}`}
					onchange={(event) => (zoom = Number(event.currentTarget.value))}
				>
					<option value="50">50%</option>
					<option value="75">75%</option>
					<option value="100">100%</option>
					<option value="125">125%</option>
					<option value="150">150%</option>
				</select>
			</div>
			<div class="font-mono text-[10px] text-muted-foreground">
				{isSaving ? "saving..." : "autosaved"}
			</div>
		</div>

		<div
			bind:this={viewerEl}
			class="sleek-grid min-h-0 overflow-auto bg-zinc-100 p-3 [scrollbar-gutter:stable] dark:bg-[#121214]"
		>
			{#if doc.fileUrl}
				{#key doc.fileUrl}
					<PdfCanvasViewer
						fileUrl={doc.fileUrl}
						{zoom}
						{fitMode}
						scrollRoot={viewerEl}
						class="mx-auto"
						pageClassName="relative overflow-visible border-t-8 border-zinc-300 bg-white ring-1 ring-black/10"
						onPageClick={addField}
						onDocumentLoad={handleDocumentLoad}
						onVisiblePageChange={handleVisiblePageChange}
						{renderOverlay}
					/>
				{/key}
			{:else}
				<div
					class="mx-auto flex min-h-64 w-full items-center justify-center rounded-lg border border-dashed border-border bg-background px-6 text-center text-sm text-muted-foreground"
				>
					{doc.uploadStatus === "pending_upload"
						? "Document is still uploading. Refresh in a moment."
						: "Document file is not ready yet."}
				</div>
			{/if}
		</div>

		<div class="flex flex-wrap items-center justify-center gap-2 border-t border-border bg-card px-3 py-2">
			<Button
				variant="ghost"
				size="sm"
				class="h-8"
				disabled={currentPage <= 0 || pageCount === 0}
				onclick={() => goToPage(currentPage - 1)}
			>
				Prev
			</Button>
			<span class="flex h-8 items-center border border-border bg-background px-3 font-mono text-xs">
				{Math.min(currentPage + 1, Math.max(pageCount, 1))}
			</span>
			<span class="font-mono text-xs text-muted-foreground">/ {Math.max(pageCount, 1)}</span>
			<Button
				variant="ghost"
				size="sm"
				class="h-8"
				disabled={pageCount === 0 || currentPage >= pageCount - 1}
				onclick={() => goToPage(currentPage + 1)}
			>
				Next
			</Button>
			<select
				class="h-8 rounded-md border border-border bg-background px-2 text-xs"
				value={fitMode}
				onchange={(event) => {
					fitMode = event.currentTarget.value as "width" | "page";
					zoom = 100;
				}}
			>
				<option value="width">Fit Width</option>
				<option value="page">Fit Page</option>
			</select>
		</div>
	</section>

	<aside class="flex min-h-[220px] flex-col border-t border-border bg-card p-3 lg:min-h-0 lg:border-l lg:border-t-0">
		<h3 class="mb-4 font-mono text-[10px] font-semibold">Field Inspector</h3>
		<FieldInspector
			selectedField={selectedField}
			{roleConfigs}
			onUpdate={persistField}
			onRoleConfigsChange={persistRoleConfigs}
			onDelete={deleteField}
		/>
	</aside>
</div>
