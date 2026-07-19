<script lang="ts">
  import { onMount, tick } from "svelte";
  import type { FoldedNode, ScanData, ScanNodeKind } from "$lib/codebase-scan";
  import { foldGraph } from "$lib/codebase-scan";
  import {
    arrowPath,
    layoutScanGraph,
    longestSegmentMidpoint,
    roundedEdgePath,
    type ScanLayout,
    type SizedScanNode,
  } from "$lib/codebase-scan-layout";
  import { cn } from "$lib/utils";
  import { scanKindStyles } from "./scan-kinds";
  import {
    ArrowSquareOutIcon,
    MagnifyingGlassMinus,
    MagnifyingGlassPlus,
  } from "phosphor-svelte";

  type GraphNode = FoldedNode & SizedScanNode;
  type Transform = { x: number; y: number; k: number };
  const minimumZoom = 0.05;

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
    | {
        pointerX: number;
        pointerY: number;
        x: number;
        y: number;
        moved: boolean;
      }
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
    return (!kindFocus || kindFocus.has(id)) && (!trace || trace.nodes.has(id));
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
    const compact = viewportEl.clientWidth <= 760;
    const leftPadding = compact ? 20 : 272;
    const rightPadding = compact ? 20 : 164;
    const topPadding = compact ? 80 : 88;
    const bottomPadding = compact ? 120 : 88;
    const availableWidth = Math.max(
      1,
      viewportEl.clientWidth - leftPadding - rightPadding,
    );
    const availableHeight = Math.max(
      1,
      viewportEl.clientHeight - topPadding - bottomPadding,
    );
    const scale = Math.min(
      1,
      Math.max(
        minimumZoom,
        Math.min(
          availableWidth / layout.width,
          availableHeight / layout.height,
        ) * 0.94,
      ),
    );
    transform = {
      x: leftPadding + (availableWidth - layout.width * scale) / 2,
      y: topPadding + (availableHeight - layout.height * scale) / 2,
      k: scale,
    };
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
      Math.hypot(event.clientX - drag.pointerX, event.clientY - drag.pointerY) >
      4
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
    const scale = Math.min(3, Math.max(minimumZoom, transform.k * factor));
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
    layoutScanGraph(sized, folded.edges, {
      rootYOffset: { Identity: -520, Workspace: -520 },
      centerRootNodes: ["postgres"],
      alignIncomingTrunks: ["postgres"],
    }).then(async (result) => {
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
          Math.max(
            minimumZoom,
            transform.k * Math.exp(-event.deltaY * 0.012),
          ),
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

<section class="absolute inset-0 z-10">
  <div
    class="absolute right-6 bottom-6 z-[25] flex flex-col items-end gap-3 max-[760px]:right-3 max-[760px]:bottom-3"
  >
    <div class="flex flex-col gap-2" role="group" aria-label="Zoom">
      <button
        type="button"
        class="grid size-9 cursor-pointer place-items-center rounded-lg border border-border bg-background text-foreground hover:bg-[color-mix(in_oklab,var(--background)_88%,var(--foreground))]"
        aria-label="Zoom in"
        onclick={(event) => {
          event.stopPropagation();
          zoomBy(1.25);
        }}
      >
        <MagnifyingGlassPlus class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="grid size-9 cursor-pointer place-items-center rounded-lg border border-border bg-background text-foreground hover:bg-[color-mix(in_oklab,var(--background)_88%,var(--foreground))]"
        aria-label="Zoom out"
        onclick={(event) => {
          event.stopPropagation();
          zoomBy(0.8);
        }}
      >
        <MagnifyingGlassMinus class="size-4" aria-hidden="true" />
      </button>
    </div>
    <a
      href="https://www.foglamp.dev/scan"
      target="_blank"
      rel="noreferrer"
      class="flex items-center gap-1 text-xs text-muted-foreground no-underline transition-colors hover:text-foreground"
    >
      Architecture Reference: <b class="underline">FogLamp.dev/scan </b>
      <ArrowSquareOutIcon class="size-3" aria-hidden="true" />
    </a>
  </div>
  <div
    bind:this={viewportEl}
    class="absolute inset-0 cursor-grab touch-none overflow-hidden bg-[linear-gradient(color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--border)_45%,transparent)_1px,transparent_1px)] bg-size-[56px_56px] bg-center active:cursor-grabbing"
    role="application"
    aria-label="Interactive SleekSign architecture map"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointerleave={() => (drag = undefined)}
  >
    {#if layout}
      <div
        class="absolute top-0 left-0 origin-top-left"
        style={`width:${layout.width}px;height:${layout.height}px;transform:translate(${transform.x}px,${transform.y}px) scale(${transform.k})`}
      >
        {#each layout.groups as group (group.id)}
          <div
            class="group-box absolute rounded-2xl border border-border/82 bg-card/92"
            style={`left:${group.x}px;top:${group.y}px;width:${group.width}px;height:${group.height}px`}
          >
            <span
              class="absolute top-4 left-4 text-[10px] font-medium tracking-wide text-muted-foreground uppercase"
              >{group.label}</span
            >
          </div>
        {/each}

        <svg
          class="pointer-events-none absolute inset-0 overflow-visible"
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
                <circle class="edge-beam fill-orange-500" r="2.2">
                  <animateMotion
                    dur={`${4 + (index % 4)}s`}
                    begin={`${1 + (index % 8) * 0.7}s`}
                    repeatCount="indefinite"
                    {path}
                  />
                </circle>
              {/if}
            </g>
          {/each}
        </svg>

        {#each layout.edges as graphEdge, index (`label-${index}`)}
          {@const original = graphEdge.original
            .map((edgeIndex) => folded.edges[edgeIndex])
            .filter(Boolean)}
          {@const kind = original.find((item) => item?.kind)?.kind}
          {@const kindOnly = !graphEdge.label}
          {@const inTrace =
            trace &&
            graphEdge.original.some((edgeIndex) => trace.edges.has(edgeIndex))}
          {@const text = graphEdge.label || kind}
          {@const midpoint =
            graphEdge.labelPos || longestSegmentMidpoint(graphEdge.points)}
          {#if text && midpoint && (!kindOnly || inTrace)}
            <span
              class={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-background px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground/80 transition-opacity duration-300",
                !edgeIsActive(graphEdge.original) && "opacity-15",
              )}
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
            class={cn(
              "node-wrap absolute transition-opacity duration-300",
              !nodeIsActive(item.id) && "opacity-25",
            )}
            style={`left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px;animation-delay:${0.12 + index * 0.025}s`}
          >
            <button
              type="button"
              class={cn(
                "flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-border/72 bg-card px-3.5 py-2.5 text-left text-card-foreground",
                item.kind === "agent" && "border-orange-500/35",
              )}
              onclick={(event) => selectNode(event, item.id)}
            >
              <span class="flex w-full min-w-0 items-center gap-2.5">
                <span
                  class={cn(
                    "grid size-7 shrink-0 place-items-center rounded-2xl",
                    kind.className,
                  )}
                >
                  {#if item.domain}
                    <img
                      class="size-4 rounded-[3px]"
                      src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
                      alt=""
                    />
                  {:else}
                    <Icon weight="fill" class="size-4" />
                  {/if}
                </span>
                <span class="flex min-w-0 flex-1 flex-col justify-center">
                  <strong
                    class="overflow-hidden text-sm leading-snug font-medium text-ellipsis whitespace-nowrap"
                    >{item.label}</strong
                  >
                  {#if item.sub}
                    <small
                      class="overflow-hidden text-xs leading-snug text-ellipsis whitespace-nowrap text-muted-foreground"
                      >{item.sub}</small
                    >
                  {/if}
                </span>
              </span>
              {#if item.embeds.length}
                <span
                  class="flex w-full flex-col justify-center gap-2 border-t border-muted px-0.5 py-2.5"
                >
                  {#each item.embeds as embedded (embedded.id)}
                    {@const embeddedKind = scanKindStyles[embedded.kind]}
                    {@const EmbeddedIcon = embeddedKind.icon}
                    <span class="flex items-center gap-1.5 text-xs font-medium">
                      {#if embedded.domain}
                        <img
                          class="size-3 rounded-sm"
                          src={`https://www.google.com/s2/favicons?domain=${embedded.domain}&sz=32`}
                          alt=""
                        />
                      {:else}
                        <EmbeddedIcon
                          weight="fill"
                          class="size-3 text-muted-foreground"
                        />
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
          class="detail-popover absolute z-30 w-60 rounded-xl border border-border/65 bg-card p-4"
          style={`left:${transform.x + tracedNode.x * transform.k}px;top:${
            transform.y + (tracedNode.y + tracedNode.height + 10) * transform.k
          }px`}
        >
          <div
            class="flex items-center gap-1 text-[11px] font-medium tracking-wide"
            style={`color:${tracedKind.color}`}
          >
            <TracedIcon weight="fill" class="size-3" />{tracedKind.label}
          </div>
          <strong class="mt-1 block text-sm font-medium"
            >{tracedNode.label}</strong
          >
          {#if tracedNode.detail || tracedNode.sub}
            <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
              {tracedNode.detail || tracedNode.sub}
            </p>
          {/if}
          {#if tracedNode.sourceRef}
            <code
              class="mt-1.5 block overflow-hidden font-mono text-[10px] text-ellipsis whitespace-nowrap text-muted-foreground/80"
              >{tracedNode.sourceRef}</code
            >
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</section>

<style>
  /* SVG stroke + entrance keyframes aren't a clean Tailwind fit */
  .edge-path {
    fill: none;
    stroke: color-mix(
      in oklab,
      var(--background) 70%,
      var(--muted-foreground) 30%
    );
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @keyframes node-in {
    from {
      transform: scale(0.85);
      filter: blur(6px);
      opacity: 0;
    }
    to {
      transform: scale(1);
      filter: blur(0);
      opacity: 1;
    }
  }

  @keyframes group-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes popover-in {
    from {
      transform: translateY(-4px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .node-wrap {
    animation: node-in 550ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }

  .group-box {
    animation: group-in 500ms ease-out both;
  }

  .detail-popover {
    animation: popover-in 200ms ease-out both;
  }

  @media (prefers-reduced-motion: reduce) {
    .node-wrap,
    .group-box,
    .detail-popover {
      animation: none;
    }

    .edge-beam {
      display: none;
    }
  }
</style>
