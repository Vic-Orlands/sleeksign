<script lang="ts">
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";
	import * as pdfjs from "pdfjs-dist";
	import type { PDFDocumentProxy } from "pdfjs-dist";
	import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
	import PdfPageCanvas from "./pdf-page-canvas.svelte";

	export type PageMetrics = {
		width: number;
		height: number;
		scale: number;
	};

	let {
		fileUrl,
		zoom = 100,
		fitMode = "width",
		class: className = "",
		pageClassName = "",
		onPageClick,
		renderOverlay,
		onDocumentLoad,
		onVisiblePageChange,
	}: {
		fileUrl: string;
		zoom?: number;
		fitMode?: "width" | "page";
		class?: string;
		pageClassName?: string;
		onPageClick?: (pageIndex: number, point: { x: number; y: number }) => void;
		renderOverlay?: Snippet<[pageIndex: number, metrics: PageMetrics]>;
		onDocumentLoad?: (pageCount: number) => void;
		onVisiblePageChange?: (pageIndex: number) => void;
	} = $props();

	let hostEl = $state<HTMLDivElement | null>(null);
	let hostWidth = $state(720);
	let hostHeight = $state(900);
	let pdf = $state<PDFDocumentProxy | null>(null);
	let pageCount = $state(0);
	let error = $state<string | null>(null);
	let loadedFileUrl = $state("");

	const pages = $derived(Array.from({ length: pageCount }, (_, index) => index));
	const activePdf = $derived(loadedFileUrl === fileUrl ? pdf : null);
	const activeError = $derived(loadedFileUrl === fileUrl ? error : null);
	const targetWidth = $derived.by(() => {
		const availableWidth = Math.max(280, hostWidth - 8);
		const availableHeight = Math.max(360, hostHeight - 8);
		const baseWidth =
			fitMode === "page"
				? Math.min(availableWidth, Math.round(availableHeight / 1.294))
				: availableWidth;
		return Math.max(240, Math.round(baseWidth * (zoom / 100)));
	});

	onMount(() => {
		pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
	});

	$effect(() => {
		const host = hostEl;
		if (!host) return;

		const observer = new ResizeObserver(([entry]) => {
			hostWidth = entry.contentRect.width;
			hostHeight = entry.contentRect.height;
		});
		observer.observe(host);
		return () => observer.disconnect();
	});

	$effect(() => {
		const url = fileUrl;
		let cancelled = false;

		const task = pdfjs.getDocument({
			url,
			withCredentials: true,
		});
		task.promise
			.then((doc) => {
				if (cancelled) return;
				pdf = doc;
				pageCount = doc.numPages;
				error = null;
				loadedFileUrl = url;
				onDocumentLoad?.(doc.numPages);
			})
			.catch(() => {
				if (!cancelled) {
					pdf = null;
					pageCount = 0;
					error = "Unable to load this PDF.";
					loadedFileUrl = url;
				}
			});

		return () => {
			cancelled = true;
			task.destroy();
		};
	});
</script>

<div bind:this={hostEl} class="min-h-[420px] w-full {className}" style="height: 100%;">
	{#if activeError}
		<div
			class="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive"
		>
			{activeError}
		</div>
	{:else if !activePdf}
		<div class="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
			Loading document…
		</div>
	{:else}
		<div class="mx-auto flex w-full flex-col items-center gap-8 py-2">
			{#each pages as pageIndex (pageIndex)}
				<PdfPageCanvas
					pdf={activePdf}
					{pageIndex}
					{targetWidth}
					{pageClassName}
					{onPageClick}
					{renderOverlay}
					{onVisiblePageChange}
				/>
			{/each}
		</div>
	{/if}
</div>
