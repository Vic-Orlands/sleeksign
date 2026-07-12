<script lang="ts">
	import { cn } from "$lib/utils";
	import type { Field } from "$lib/field-utils";
	import type { PageMetrics } from "$lib/components/pdf/PdfCanvasViewer.svelte";

	let {
		field,
		index,
		metrics,
		selected,
		toneClass,
		labelClass,
		onSelect,
		onPersist,
		onDelete,
	}: {
		field: Field;
		index: number;
		metrics: PageMetrics;
		selected: boolean;
		toneClass: string;
		labelClass: string;
		onSelect: () => void;
		onPersist: (updates: Partial<Field>) => void;
		onDelete: () => void;
	} = $props();

	let dragState = $state<null | {
		mode: "move" | "resize";
		startX: number;
		startY: number;
		originX: number;
		originY: number;
		originW: number;
		originH: number;
	}>(null);

	const leftPx = $derived((field.x / 100) * metrics.width);
	const topPx = $derived((field.y / 100) * metrics.height);
	const widthPx = $derived((field.width / 100) * metrics.width);
	const heightPx = $derived((field.height / 100) * metrics.height);

	function toPercentX(px: number) {
		return (px / metrics.width) * 100;
	}

	function toPercentY(px: number) {
		return (px / metrics.height) * 100;
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragState) return;
		const dx = event.clientX - dragState.startX;
		const dy = event.clientY - dragState.startY;

		if (dragState.mode === "move") {
			onPersist({
				x: toPercentX(dragState.originX + dx),
				y: toPercentY(dragState.originY + dy),
			});
			return;
		}

		onPersist({
			x: toPercentX(dragState.originX),
			y: toPercentY(dragState.originY),
			width: toPercentX(Math.max(24, dragState.originW + dx)),
			height: toPercentY(Math.max(16, dragState.originH + dy)),
		});
	}

	function endDrag() {
		if (!dragState) return;
		dragState = null;
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", endDrag);
	}

	function startMove(event: PointerEvent) {
		event.stopPropagation();
		onSelect();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragState = {
			mode: "move",
			startX: event.clientX,
			startY: event.clientY,
			originX: leftPx,
			originY: topPx,
			originW: widthPx,
			originH: heightPx,
		};
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", endDrag);
	}

	function startResize(event: PointerEvent) {
		event.stopPropagation();
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		dragState = {
			mode: "resize",
			startX: event.clientX,
			startY: event.clientY,
			originX: leftPx,
			originY: topPx,
			originW: widthPx,
			originH: heightPx,
		};
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", endDrag);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn(
		"group absolute flex touch-none items-center justify-center border border-dashed backdrop-blur-sm outline-offset-2 transition-[background-color,outline-color]",
		toneClass,
		selected && "border-solid outline-2 outline-primary ring-2 ring-primary/20",
	)}
	style:left="{leftPx}px"
	style:top="{topPx}px"
	style:width="{widthPx}px"
	style:height="{heightPx}px"
	onpointerdown={startMove}
>
	<span class={cn("pointer-events-none absolute -top-5 left-0 whitespace-nowrap px-1.5 py-0.5 font-mono text-[9px] font-semibold", labelClass)}>
		{field.type} · {field.assigneeRole || "Unassigned"}
	</span>
	<span class="pointer-events-none font-mono text-[9px] font-semibold uppercase">{field.type}</span>
	<span class="absolute -right-2 -top-2 flex size-5 items-center justify-center bg-primary font-mono text-[10px] text-primary-foreground">
		{index + 1}
	</span>
	<button
		type="button"
		class="field-delete-button absolute -left-2 -top-2 z-10 hidden size-5 items-center justify-center border border-border bg-background text-destructive group-hover:flex"
		onpointerdown={(event) => event.stopPropagation()}
		onclick={(event) => {
			event.stopPropagation();
			onDelete();
		}}
	>
		×
	</button>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="absolute -bottom-1 -right-1 size-3 cursor-se-resize border border-primary bg-background"
		onpointerdown={startResize}
	></div>
</div>
