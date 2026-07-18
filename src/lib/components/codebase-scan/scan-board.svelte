<script lang="ts">
	import { mode, toggleMode } from "mode-watcher";
	import { fade } from "svelte/transition";
	import {
		ArrowLeftIcon,
		CheckCircle,
		Copy,
		Moon,
		Sun,
	} from "phosphor-svelte";
	import type { ScanData, ScanNodeKind } from "$lib/codebase-scan";
	import { cn } from "$lib/utils";
	import FlowMap from "./flow-map.svelte";
	import LeftRail from "./left-rail.svelte";
	import { scanKindOrder } from "./scan-kinds";
	import ShareBar from "./share-bar.svelte";

	let { data }: { data: ScanData } = $props();

	let focusKinds = $state<ScanNodeKind[] | null>(null);
	let fogVisible = $state(true);
	let copied = $state(false);
	const isDark = $derived(mode.current === "dark");
	const visibleKinds = $derived(
		scanKindOrder.filter((kind) =>
			data.graph.nodes.some((item) => item.kind === kind),
		),
	);

	const fogPuffs = [
		{ class: "top-[38%] left-0 w-[30%]" },
		{ class: "top-[14%] left-[10%] w-[36%]" },
		{ class: "top-[42%] left-[23%] w-[40%]" },
		{ class: "top-[4%] left-[38%] w-[34%]" },
		{ class: "top-[34%] left-[50%] w-[42%]" },
		{ class: "top-[10%] left-[68%] w-[31%]" },
		{ class: "top-[48%] left-[78%] w-[36%]" },
		{ class: "top-[62%] left-[22%] w-[48%]" },
		{ class: "top-[65%] left-[54%] w-[39%]" },
		{ class: "top-[66%] left-[2%] w-[43%]" },
	];

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			window.setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}
</script>

<div
	class="fixed inset-0 overflow-hidden bg-neutral-100 text-foreground dark:bg-background"
>
	<div
		class="absolute top-6 left-6 z-20 flex w-max flex-col gap-4 max-[760px]:left-3"
	>
		<a
			href="/"
			class="flex w-max items-center gap-2 text-foreground/60 no-underline transition-opacity duration-150 hover:text-foreground hover:opacity-100"
		>
			<ArrowLeftIcon class="size-3" />
			<strong class="text-sm font-[650] tracking-tight">SleekSign</strong>
		</a>
		<LeftRail {data} />
	</div>

	<div class="absolute top-6 right-6 z-20 flex gap-2 max-[760px]:right-3">
		<button
			type="button"
			class="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-xs font-medium text-foreground"
			onclick={copyLink}
		>
			{#if copied}
				<CheckCircle
					weight="fill"
					class="size-[15px] text-green-600"
					aria-hidden="true"
				/>
			{:else}
				<Copy class="size-[15px]" aria-hidden="true" />
			{/if}
			Copy link
		</button>
		<button
			type="button"
			class="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background p-0 text-foreground"
			aria-label={isDark ? "Use light theme" : "Use dark theme"}
			onclick={toggleMode}
		>
			{#if isDark}
				<Sun class="size-[15px]" aria-hidden="true" />
			{:else}
				<Moon class="size-[15px]" aria-hidden="true" />
			{/if}
		</button>
	</div>

	<FlowMap graph={data.graph} {focusKinds} />
	<ShareBar kinds={visibleKinds} bind:focusKinds />

	{#if fogVisible}
		<div
			class="absolute inset-0 z-[60] overflow-hidden bg-white/5 backdrop-blur-[1px]"
			transition:fade={{ duration: 420 }}
		>
			<div
				class="fog-cloud absolute top-[4%] left-[-14%] h-[34vh] w-[72vw] -rotate-[8deg] opacity-[0.84] blur-[25px]"
				aria-hidden="true"
			>
				{#each fogPuffs as puff}
					<i
						class={cn(
							"absolute block aspect-[1.8] rounded-full bg-[color-mix(in_oklab,var(--background)_92%,white)]",
							puff.class,
						)}
					></i>
				{/each}
			</div>
			<div
				class="fog-cloud absolute top-[35%] right-[-16%] h-[34vh] w-[72vw] rotate-[7deg] opacity-[0.84] blur-[25px] [animation-delay:-6s]"
				aria-hidden="true"
			>
				{#each fogPuffs as puff}
					<i
						class={cn(
							"absolute block aspect-[1.8] rounded-full bg-[color-mix(in_oklab,var(--background)_92%,white)]",
							puff.class,
						)}
					></i>
				{/each}
			</div>
			<div
				class="fog-cloud absolute bottom-[-10%] left-[7%] h-[34vh] w-[84vw] -rotate-[3deg] opacity-[0.84] blur-[25px] [animation-delay:-11s]"
				aria-hidden="true"
			>
				{#each fogPuffs as puff}
					<i
						class={cn(
							"absolute block aspect-[1.8] rounded-full bg-[color-mix(in_oklab,var(--background)_92%,white)]",
							puff.class,
						)}
					></i>
				{/each}
			</div>
			<div
				class="absolute top-1/2 left-1/2 grid w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-3 text-center max-[760px]:w-[calc(100%-32px)]"
			>
				<p
					class="m-0 text-[11px] font-semibold text-foreground/70"
				>
					{data.project.name} · {data.graph.nodes.length} entities ·
					{data.graph.edges.length} relationships
				</p>
				<button
					type="button"
					class="cursor-pointer rounded-full border border-foreground/20 bg-foreground px-5 py-3.5 text-xs font-[650] text-background"
					onclick={() => (fogVisible = false)}
				>
					View Entity-Relationship Diagram
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes fog-drift {
		from {
			translate: -2% -1%;
			scale: 0.98;
		}
		to {
			translate: 3% 2%;
			scale: 1.04;
		}
	}

	.fog-cloud {
		animation: fog-drift 17s ease-in-out infinite alternate;
	}

	@media (prefers-reduced-motion: reduce) {
		.fog-cloud {
			animation: none;
		}
	}
</style>
