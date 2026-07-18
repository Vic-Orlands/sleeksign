<script lang="ts">
	import { onMount, tick } from "svelte";
	import MagnifyingGlassMinus from "phosphor-svelte/lib/MagnifyingGlassMinus";
	import MagnifyingGlassPlus from "phosphor-svelte/lib/MagnifyingGlassPlus";
	import type {
		FoldedNode,
		ScanData,
		ScanNodeKind,
	} from "$lib/codebase-scan";
	import { foldGraph } from "$lib/codebase-scan";
	import {
		arrowPath,
		layoutScanGraph,
		longestSegmentMidpoint,
		roundedEdgePath,
		type ScanLayout,
		type SizedScanNode,
	} from "$lib/codebase-scan-layout";
	import { scanKindStyles } from "./scan-kinds";

	type GraphNode = FoldedNode & SizedScanNode;
	type Transform = { x: number; y: number; k: number };

	let {
		graph,
		focusKinds,
	}: {
		graph: ScanData["graph"];
		focusKinds: ScanNodeKind[] | null;
	} = $props();

	let viewportEl = $state<HTMLElement | null>(null);
	let layout = $state<ScanLayout<GraphNode> | null>(null);
	let transform = $state<Transform>({ x: 0, y: 0, k: 1 });
	let traceRoot = $state("");
	let drag:
		| { pointerX: number; pointerY: number; x: number; y: number; moved: boolean }
		| undefined;

	const folded = $derived(foldGraph(graph));
	const nodeById = $derived(
		new Map((layout?.nodes || []).map((item) => [item.id, item])),
	);
	const trace = $derived.by(() => {
		if (!traceRoot) return null;
		const nodes = new Set([traceRoot]);
		const edges = new Set<number>();
		const queue = [traceRoot];
		while (queue.length) {
			const current = queue.shift();
			folded.edges.forEach((graphEdge, index) => {
				if (graphEdge.from !== current) return;
				edges.add(index);
				if (!nodes.has(graphEdge.to)) {
					nodes.add(graphEdge.to);
					queue.push(graphEdge.to);
				}
			});
		}
		return { nodes, edges };
	});
	const kindFocus = $derived.by(() => {
		if (!focusKinds?.length) return null;
		const kinds = new Set(focusKinds);
		return new Set(
			folded.nodes
				.filter(
					(item) =>
						kinds.has(item.kind) ||
						item.embeds.some((embedded) => kinds.has(embedded.kind)),
				)
				.map((item) => item.id),
		);
	});
	const tracedNode = $derived(traceRoot ? nodeById.get(traceRoot) : undefined);

	function nodeHeight(item: FoldedNode) {
		return item.embeds.length ? 56 + item.embeds.length * 24 + 12 : 56;
	}

	function nodeIsActive(id: string) {
		return (
			(!kindFocus || kindFocus.has(id)) &&
			(!trace || trace.nodes.has(id))
		);
	}

	function edgeIsActive(original: number[]) {
		const matchesKind =
			!kindFocus ||
			original.some((index) => {
				const graphEdge = folded.edges[index];
				return Boolean(
					graphEdge &&
						(kindFocus.has(graphEdge.from) || kindFocus.has(graphEdge.to)),
				);
			});
		const matchesTrace =
			!trace || original.some((index) => trace.edges.has(index));
		return matchesKind && matchesTrace;
	}

	function fitGraph() {
		if (!viewportEl || !layout) return;
		const leftPadding = viewportEl.clientWidth <= 760 ? 24 : 264;
		const rightPadding = 48;
		const verticalPadding = 56;
		const availableWidth = Math.max(
			200,
			viewportEl.clientWidth - leftPadding - rightPadding,
		);
		const availableHeight = Math.max(
			200,
			viewportEl.clientHeight - verticalPadding * 2,
		);
		const fit = Math.min(
			availableWidth / layout.width,
			availableHeight / layout.height,
		);
		if (fit >= 0.45) {
			const scale = Math.min(1, Math.max(0.3, fit));
			transform = {
				x: leftPadding + (availableWidth - layout.width * scale) / 2,
				y: verticalPadding + (availableHeight - layout.height * scale) / 2,
				k: scale,
			};
		} else {
			const scale = Math.min(
				0.8,
				Math.max(0.5, (availableHeight / layout.height) * 0.9),
			);
			transform = {
				x: leftPadding + 16,
				y: verticalPadding + (availableHeight - layout.height * scale) / 2,
				k: scale,
			};
		}
	}

	function handlePointerDown(event: PointerEvent) {
		if (!(event.target instanceof Element)) return;
		event.target.setPointerCapture?.(event.pointerId);
		drag = {
			pointerX: event.clientX,
			pointerY: event.clientY,
			x: transform.x,
			y: transform.y,
			moved: false,
		};
	}

	function handlePointerMove(event: PointerEvent) {
		if (!drag) return;
		if (
			Math.hypot(
				event.clientX - drag.pointerX,
				event.clientY - drag.pointerY,
			) > 4
		) {
			drag.moved = true;
		}
		transform = {
			...transform,
			x: drag.x + event.clientX - drag.pointerX,
			y: drag.y + event.clientY - drag.pointerY,
		};
	}

	function handlePointerUp() {
		if (drag && !drag.moved) traceRoot = "";
		drag = undefined;
	}

	function selectNode(event: MouseEvent, id: string) {
		event.stopPropagation();
		if (drag?.moved) return;
		traceRoot = traceRoot === id ? "" : id;
		drag = undefined;
	}

	function zoomBy(factor: number) {
		if (!viewportEl) return;
		const centerX = viewportEl.clientWidth / 2;
		const centerY = viewportEl.clientHeight / 2;
		const scale = Math.min(3, Math.max(0.2, transform.k * factor));
		const ratio = scale / transform.k;
		transform = {
			k: scale,
			x: centerX - (centerX - transform.x) * ratio,
			y: centerY - (centerY - transform.y) * ratio,
		};
	}

	onMount(() => {
		let cancelled = false;
		const degree = new Map<string, number>();
		for (const graphEdge of folded.edges) {
			degree.set(graphEdge.from, (degree.get(graphEdge.from) || 0) + 1);
			degree.set(graphEdge.to, (degree.get(graphEdge.to) || 0) + 1);
		}
		const sized: GraphNode[] = folded.nodes.map((item) => ({
			...item,
			width: 208 + Math.min(degree.get(item.id) || 0, 6) * 7,
			height: nodeHeight(item),
		}));
		layoutScanGraph(sized, folded.edges).then(async (result) => {
			if (cancelled) return;
			layout = result;
			await tick();
			fitGraph();
		});

		const resizeObserver = new ResizeObserver(fitGraph);
		if (viewportEl) resizeObserver.observe(viewportEl);
		const handleWheel = (event: WheelEvent) => {
			if (!viewportEl) return;
			event.preventDefault();
			if (event.ctrlKey || event.metaKey) {
				const bounds = viewportEl.getBoundingClientRect();
				const centerX = event.clientX - bounds.left;
				const centerY = event.clientY - bounds.top;
				const scale = Math.min(
					3,
					Math.max(0.2, transform.k * Math.exp(-event.deltaY * 0.012)),
				);
				const ratio = scale / transform.k;
				transform = {
					k: scale,
					x: centerX - (centerX - transform.x) * ratio,
					y: centerY - (centerY - transform.y) * ratio,
				};
			} else {
				transform = {
					...transform,
					x: transform.x - event.deltaX,
					y: transform.y - event.deltaY,
				};
			}
		};
		viewportEl?.addEventListener("wheel", handleWheel, { passive: false });

		return () => {
			cancelled = true;
			resizeObserver.disconnect();
			viewportEl?.removeEventListener("wheel", handleWheel);
		};
	});
</script>

<section class="map">
	<div class="zoom-controls" role="group" aria-label="Zoom">
		<button
			type="button"
			aria-label="Zoom in"
			onclick={(event) => {
				event.stopPropagation();
				zoomBy(1.25);
			}}
		>
			<MagnifyingGlassPlus aria-hidden="true" />
		</button>
		<button
			type="button"
			aria-label="Zoom out"
			onclick={(event) => {
				event.stopPropagation();
				zoomBy(0.8);
			}}
		>
			<MagnifyingGlassMinus aria-hidden="true" />
		</button>
	</div>
	<div
		bind:this={viewportEl}
		class="viewport"
		role="application"
		aria-label="Interactive SleekSign architecture map"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointerleave={() => (drag = undefined)}
	>
		{#if layout}
			<div
				class="graph"
				style={`width:${layout.width}px;height:${layout.height}px;transform:translate(${transform.x}px,${transform.y}px) scale(${transform.k})`}
			>
				{#each layout.groups as group (group.id)}
					<div
						class="group-box"
						style={`left:${group.x}px;top:${group.y}px;width:${group.width}px;height:${group.height}px`}
					>
						<span>{group.label}</span>
					</div>
				{/each}

				<svg
					class="edges"
					width={layout.width}
					height={layout.height}
					aria-hidden="true"
				>
					{#each layout.edges as graphEdge, index (`edge-${index}`)}
						{@const path = roundedEdgePath(graphEdge.points)}
						{@const active = edgeIsActive(graphEdge.original)}
						<g opacity={active ? 1 : 0.15}>
							<path class="edge-path" d={path} />
							<path class="edge-path" d={arrowPath(graphEdge.points)} />
							{#if active}
								<circle class="edge-beam" r="2.2">
									<animateMotion
										dur={`${4 + (index % 4)}s`}
										begin={`${1 + (index % 8) * 0.7}s`}
										repeatCount="indefinite"
										path={path}
									/>
								</circle>
							{/if}
						</g>
					{/each}
				</svg>

				{#each layout.edges as graphEdge, index (`label-${index}`)}
					{@const original = graphEdge.original.map((edgeIndex) => folded.edges[edgeIndex]).filter(Boolean)}
					{@const kind = original.find((item) => item?.kind)?.kind}
					{@const kindOnly = !graphEdge.label}
					{@const inTrace = trace && graphEdge.original.some((edgeIndex) => trace.edges.has(edgeIndex))}
					{@const text = graphEdge.label || kind}
					{@const midpoint = graphEdge.labelPos || longestSegmentMidpoint(graphEdge.points)}
					{#if text && midpoint && (!kindOnly || inTrace)}
						<span
							class="edge-label"
							class:dimmed={!edgeIsActive(graphEdge.original)}
							style={`left:${midpoint.x}px;top:${midpoint.y}px`}
						>
							{text}
						</span>
					{/if}
				{/each}

				{#each layout.nodes as item, index (item.id)}
					{@const kind = scanKindStyles[item.kind]}
					{@const Icon = kind.icon}
					<div
						class="node-wrap"
						class:dimmed={!nodeIsActive(item.id)}
						style={`left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px;animation-delay:${0.12 + index * 0.025}s`}
					>
						<button
							type="button"
							class="node-card"
							class:agent={item.kind === "agent"}
							onclick={(event) => selectNode(event, item.id)}
						>
							<span class={`node-icon ${kind.className}`}>
								{#if item.domain}
									<img
										src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
										alt=""
									/>
								{:else}
									<Icon weight="fill" />
								{/if}
							</span>
							<span class="node-copy">
								<strong>{item.label}</strong>
								{#if item.sub}<small>{item.sub}</small>{/if}
							</span>
							{#if item.embeds.length}
								<span class="embeds">
									{#each item.embeds as embedded (embedded.id)}
										{@const embeddedKind = scanKindStyles[embedded.kind]}
										{@const EmbeddedIcon = embeddedKind.icon}
										<span>
											{#if embedded.domain}
												<img
													src={`https://www.google.com/s2/favicons?domain=${embedded.domain}&sz=32`}
													alt=""
												/>
											{:else}
												<EmbeddedIcon weight="fill" />
											{/if}
											{embedded.label}
										</span>
									{/each}
								</span>
							{/if}
						</button>
					</div>
				{/each}
			</div>

			{#if tracedNode}
				{@const tracedKind = scanKindStyles[tracedNode.kind]}
				{@const TracedIcon = tracedKind.icon}
				<div
					class="detail-popover"
					style={`left:${transform.x + tracedNode.x * transform.k}px;top:${
						transform.y + (tracedNode.y + tracedNode.height + 10) * transform.k
					}px`}
				>
					<div class="detail-kind" style={`color:${tracedKind.color}`}>
						<TracedIcon weight="fill" />{tracedKind.label}
					</div>
					<strong>{tracedNode.label}</strong>
					{#if tracedNode.detail || tracedNode.sub}
						<p>{tracedNode.detail || tracedNode.sub}</p>
					{/if}
					{#if tracedNode.sourceRef}<code>{tracedNode.sourceRef}</code>{/if}
				</div>
			{/if}
		{/if}
	</div>
</section>

<style>
	.map { position: absolute; z-index: 10; inset: 0; }
	.zoom-controls {
		position: absolute;
		z-index: 25;
		right: 24px;
		bottom: 88px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.zoom-controls button {
		display: grid;
		width: 36px;
		height: 36px;
		place-items: center;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--background);
		color: var(--foreground);
		cursor: pointer;
	}
	.zoom-controls button :global(svg) { width: 16px; height: 16px; }
	.zoom-controls button:hover {
		background: color-mix(in oklab, var(--background) 88%, var(--foreground));
	}
	@media (max-width: 760px) {
		.zoom-controls { right: 12px; bottom: 76px; }
	}
	.viewport {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background-image:
			linear-gradient(color-mix(in oklab, var(--border) 45%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in oklab, var(--border) 45%, transparent) 1px, transparent 1px);
		background-position: center;
		background-size: 56px 56px;
		cursor: grab;
		touch-action: none;
	}
	.viewport:active { cursor: grabbing; }
	.graph {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: top left;
	}
	.group-box {
		position: absolute;
		border: 1px solid color-mix(in oklab, var(--border) 82%, transparent);
		border-radius: 16px;
		background: color-mix(in oklab, var(--card) 92%, transparent);
		animation: group-in 500ms ease-out both;
	}
	.group-box span {
		position: absolute;
		top: 16px;
		left: 16px;
		color: var(--muted-foreground);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.edges { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
	.edge-path {
		fill: none;
		stroke: color-mix(in oklab, var(--background) 70%, var(--muted-foreground) 30%);
		stroke-width: 1.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.edge-beam {
		fill: #f97316;
	}
	.edge-label {
		position: absolute;
		transform: translate(-50%, -50%);
		border-radius: 999px;
		background: var(--background);
		padding: 2px 8px;
		color: color-mix(in oklab, var(--muted-foreground) 80%, transparent);
		font-size: 12px;
		white-space: nowrap;
		transition: opacity 300ms ease;
	}
	.edge-label.dimmed { opacity: 0.15; }
	.node-wrap {
		position: absolute;
		animation: node-in 550ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
		transition: opacity 300ms ease;
	}
	.node-wrap.dimmed { opacity: 0.25; }
	.node-card {
		display: flex;
		width: 100%;
		height: 100%;
		flex-wrap: wrap;
		align-content: flex-start;
		align-items: center;
		gap: 10px;
		overflow: hidden;
		border: 1px solid color-mix(in oklab, var(--border) 72%, transparent);
		border-radius: 12px;
		background: var(--card);
		padding: 0 14px;
		color: var(--card-foreground);
		text-align: left;
		cursor: pointer;
	}
	.node-card.agent { border-color: rgb(249 115 22 / 0.35); }
	.node-icon {
		display: grid;
		width: 28px;
		height: 28px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 16px;
	}
	.node-icon :global(svg),
	.node-icon img { width: 16px; height: 16px; border-radius: 3px; }
	.node-icon.entry { background: var(--muted); color: var(--foreground); }
	.node-icon.cron { background: rgb(245 158 11 / 0.1); color: #f59e0b; }
	.node-icon.agent { background: rgb(249 115 22 / 0.1); color: #f97316; }
	.node-icon.model { background: rgb(59 130 246 / 0.1); color: #3b82f6; }
	.node-icon.tool { background: rgb(139 92 246 / 0.1); color: #8b5cf6; }
	.node-icon.service { background: rgb(236 72 153 / 0.1); color: #ec4899; }
	.node-icon.store { background: rgb(16 185 129 / 0.1); color: #10b981; }
	.node-icon.external { background: rgb(14 165 233 / 0.1); color: #0ea5e9; }
	.node-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
	.node-copy strong { overflow: hidden; font-size: 14px; font-weight: 500; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
	.node-copy small { overflow: hidden; color: var(--muted-foreground); font-size: 12px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
	.embeds {
		display: flex;
		width: 100%;
		flex-direction: column;
		gap: 8px;
		border-top: 1px solid var(--muted);
		padding: 10px 2px;
	}
	.embeds > span { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; }
	.embeds :global(svg),
	.embeds img { width: 12px; height: 12px; border-radius: 2px; color: var(--muted-foreground); }
	.detail-popover {
		position: absolute;
		z-index: 30;
		width: 240px;
		border: 1px solid color-mix(in oklab, var(--border) 65%, transparent);
		border-radius: 12px;
		background: var(--card);
		padding: 16px;
		animation: popover-in 200ms ease-out both;
	}
	.detail-kind { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; letter-spacing: 0.04em; }
	.detail-kind :global(svg) { width: 12px; height: 12px; }
	.detail-popover > strong { display: block; margin-top: 4px; font-size: 14px; font-weight: 500; }
	.detail-popover p { margin: 4px 0 0; color: var(--muted-foreground); font-size: 12px; line-height: 1.5; }
	.detail-popover code { display: block; overflow: hidden; margin-top: 6px; color: color-mix(in oklab, var(--muted-foreground) 82%, transparent); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
	@keyframes node-in {
		from { transform: scale(0.85); filter: blur(6px); opacity: 0; }
		to { transform: scale(1); filter: blur(0); opacity: 1; }
	}
	@keyframes group-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes popover-in {
		from { transform: translateY(-4px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}
	@media (prefers-reduced-motion: reduce) {
		.node-wrap,
		.group-box,
		.detail-popover { animation: none; }
		.edge-beam { display: none; }
	}
</style>
