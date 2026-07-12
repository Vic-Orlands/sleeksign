<script lang="ts">
	import "@xyflow/svelte/dist/style.css";

	import {
		MarkerType,
		Position,
		SvelteFlow,
		SvelteFlowProvider,
		type Edge,
		type Node,
		type NodeTypes
	} from "@xyflow/svelte";
	import CaretDown from "phosphor-svelte/lib/CaretDown";
	import CaretUp from "phosphor-svelte/lib/CaretUp";
	import Files from "phosphor-svelte/lib/Files";
	import ShieldCheck from "phosphor-svelte/lib/ShieldCheck";
	import UsersThree from "phosphor-svelte/lib/UsersThree";
	import type { Component } from "svelte";
	import { fade, fly } from "svelte/transition";

	import RelationshipNode from "./relationship-node.svelte";

	type RelationshipNodeData = {
		label: string;
		tone: "document" | "shared" | "private" | "recipient";
		eyebrow?: string;
	};

	type PacketModel = {
		id: string;
		label: string;
		title: string;
		summary: string;
		detail: string;
		helper: string;
		icon: Component;
		nodes: Node<RelationshipNodeData>[];
		edges: Edge[];
	};

	const packetModels: PacketModel[] = [
		{
			id: "collaborative",
			label: "Collaborative packet",
			title: "Everyone signs the same live document.",
			summary:
				"HR, employee, and witness work on one packet, so each completed signature becomes visible inside the same shared agreement.",
			detail:
				"Use this when every collaborator should see the same evolving document state and the final file should close only after the whole chain is done.",
			helper: "One packet. One live document. Shared visibility across the signing chain.",
			icon: UsersThree,
			nodes: [
				{
					id: "collab-hr",
					position: { x: 0, y: 26 },
					data: { label: "HR", eyebrow: "Shared signer", tone: "shared" },
					type: "relationship",
					sourcePosition: Position.Right,
					targetPosition: Position.Right
				},
				{
					id: "collab-employee",
					position: { x: 0, y: 144 },
					data: { label: "Employee", eyebrow: "Shared signer", tone: "shared" },
					type: "relationship",
					sourcePosition: Position.Right,
					targetPosition: Position.Right
				},
				{
					id: "collab-witness",
					position: { x: 0, y: 262 },
					data: { label: "Witness", eyebrow: "Shared signer", tone: "shared" },
					type: "relationship",
					sourcePosition: Position.Right,
					targetPosition: Position.Right
				},
				{
					id: "collab-doc",
					position: { x: 300, y: 144 },
					data: {
						label: "Shared packet",
						eyebrow: "Live document",
						tone: "document"
					},
					type: "relationship",
					sourcePosition: Position.Right,
					targetPosition: Position.Left
				},
				{
					id: "collab-final",
					position: { x: 540, y: 144 },
					data: {
						label: "One finalized PDF",
						eyebrow: "Shared output",
						tone: "recipient"
					},
					type: "relationship",
					sourcePosition: Position.Left,
					targetPosition: Position.Left
				}
			],
			edges: [
				edge("collab-hr", "collab-doc", "fills HR fields"),
				edge("collab-employee", "collab-doc", "fills employee fields"),
				edge("collab-witness", "collab-doc", "fills witness fields"),
				edge("collab-doc", "collab-final", "single final artifact")
			]
		},
		{
			id: "individual",
			label: "Individual copies",
			title: "One template, separate copies for each signer.",
			summary:
				"Every recipient signs their own copy, so nobody sees anyone else’s signature, date, or private form data.",
			detail:
				"Use this for acknowledgements, handbook receipts, tax forms, or any bulk send where each signer should stay fully isolated.",
			helper: "One template fans out into separate recipient-owned signing copies.",
			icon: Files,
			nodes: [
				{
					id: "ind-template",
					position: { x: 256, y: 148 },
					data: {
						label: "Template document",
						eyebrow: "Reusable source",
						tone: "document"
					},
					type: "relationship",
					sourcePosition: Position.Right,
					targetPosition: Position.Left
				},
				{
					id: "ind-copy-a",
					position: { x: 550, y: 24 },
					data: {
						label: "Employee copy",
						eyebrow: "Private packet",
						tone: "private"
					},
					type: "relationship",
					sourcePosition: Position.Left,
					targetPosition: Position.Left
				},
				{
					id: "ind-copy-b",
					position: { x: 550, y: 148 },
					data: {
						label: "Contractor copy",
						eyebrow: "Private packet",
						tone: "private"
					},
					type: "relationship",
					sourcePosition: Position.Left,
					targetPosition: Position.Left
				},
				{
					id: "ind-copy-c",
					position: { x: 550, y: 272 },
					data: {
						label: "Witness copy",
						eyebrow: "Private packet",
						tone: "private"
					},
					type: "relationship",
					sourcePosition: Position.Left,
					targetPosition: Position.Left
				},
				{
					id: "ind-signers",
					position: { x: 0, y: 148 },
					data: {
						label: "HR sends once",
						eyebrow: "Template owner",
						tone: "shared"
					},
					type: "relationship",
					sourcePosition: Position.Right,
					targetPosition: Position.Right
				}
			],
			edges: [
				edge("ind-signers", "ind-template", "shares template"),
				edge("ind-template", "ind-copy-a", "separate copy"),
				edge("ind-template", "ind-copy-b", "separate copy"),
				edge("ind-template", "ind-copy-c", "separate copy")
			]
		},
		{
			id: "shared-base",
			label: "Shared-base copies",
			title: "Company signs once, recipients countersign their own copy.",
			summary:
				"The employer or HR signature is shared across every recipient copy, while each employee or contractor only sees their own private signing section.",
			detail:
				"Use this when the company’s sign-off must appear everywhere, but each recipient should only collaborate with the shared company side and not with other recipients.",
			helper: "Shared company layer feeds multiple recipient-specific copies.",
			icon: ShieldCheck,
			nodes: [
				{
					id: "base-shared",
					position: { x: 250, y: 148 },
					data: {
						label: "Shared company layer",
						eyebrow: "HR + employer fields",
						tone: "shared"
					},
					type: "relationship",
					sourcePosition: Position.Right,
					targetPosition: Position.Left
				},
				{
					id: "base-template",
					position: { x: 0, y: 148 },
					data: {
						label: "Packet template",
						eyebrow: "Source document",
						tone: "document"
					},
					type: "relationship",
					sourcePosition: Position.Right,
					targetPosition: Position.Right
				},
				{
					id: "base-copy-a",
					position: { x: 500, y: 44 },
					data: {
						label: "Employee copy",
						eyebrow: "Private recipient",
						tone: "recipient"
					},
					type: "relationship",
					sourcePosition: Position.Left,
					targetPosition: Position.Left
				},
				{
					id: "base-copy-b",
					position: { x: 500, y: 252 },
					data: {
						label: "Contractor copy",
						eyebrow: "Private recipient",
						tone: "recipient"
					},
					type: "relationship",
					sourcePosition: Position.Left,
					targetPosition: Position.Left
				},
				{
					id: "base-third",
					position: { x: 720, y: 252 },
					data: {
						label: "Witness on copy",
						eyebrow: "Optional shared third party",
						tone: "private"
					},
					type: "relationship",
					sourcePosition: Position.Left,
					targetPosition: Position.Left
				}
			],
			edges: [
				edge("base-template", "base-shared", "company signs first"),
				edge("base-shared", "base-copy-a", "shared signature appears here"),
				edge("base-shared", "base-copy-b", "shared signature appears here"),
				edge("base-copy-b", "base-third", "optional collaborator on same copy")
			]
		}
	];

	const nodeTypes: NodeTypes = {
		relationship: RelationshipNode
	};

	let activeId = $state(packetModels[0].id);

	const activeModel = $derived(
		packetModels.find((model) => model.id === activeId) ?? packetModels[0]
	);

	function edge(source: string, target: string, label: string): Edge {
		return {
			id: `${source}-${target}`,
			source,
			target,
			label,
			type: "smoothstep",
			animated: true,
			markerEnd: {
				type: MarkerType.ArrowClosed,
				width: 15,
				height: 15,
				color: "#52525b"
			},
			style: "stroke: #52525b; stroke-width: 1.5",
			labelStyle: "fill: #52525b; opacity: 0.9; font-size: 9px; font-weight: 500"
		};
	}
</script>

<div class="flex w-full justify-center text-center">
	<div>
		<p class="mb-2 text-[9px] font-medium uppercase tracking-[0.2em] text-orange-500/70">
			Relationship graph
		</p>
		<h3 class="text-[18px] font-light tracking-tight text-foreground">
			{activeModel.label}
		</h3>
	</div>
</div>

<div class="flex flex-col items-center gap-16 lg:flex-row">
	<div class="w-full shrink-0 lg:ml-[7%] lg:w-[18rem]">
		<div class="flex h-full flex-col">
			<p class="mb-8 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
				Packet models
			</p>
			<div class="relative flex flex-1 flex-col gap-6">
				{#each packetModels as model (model.id)}
					{@const isActive = model.id === activeModel.id}
					<button
						type="button"
						onclick={() => (activeId = model.id)}
						class="w-full text-left outline-none transition-all duration-300 {isActive
							? 'opacity-100'
							: 'opacity-40 hover:opacity-70'}"
						in:fly={{ y: 8, duration: 300 }}
					>
						<div class="flex items-center justify-between gap-3">
							<div>
								<h3
									class="text-[15px] transition-colors duration-300 {isActive
										? 'font-medium text-foreground'
										: 'font-light text-foreground'}"
								>
									{model.label}
								</h3>
							</div>

							<div class="relative h-4 w-4">
								{#key isActive}
									{#if isActive}
										<div
											class="absolute inset-0"
											in:fly={{ y: 2, duration: 200 }}
											out:fly={{ y: -2, duration: 200 }}
										>
											<CaretUp class="h-4 w-4 text-muted-foreground" />
										</div>
									{:else}
										<div
											class="absolute inset-0 opacity-50"
											in:fly={{ y: -2, duration: 200 }}
											out:fly={{ y: 2, duration: 200 }}
										>
											<CaretDown class="h-4 w-4 text-muted-foreground/70" />
										</div>
									{/if}
								{/key}
							</div>
						</div>

						{#if isActive}
							<div
								class="overflow-hidden"
								in:fly={{ y: -4, duration: 300 }}
								out:fade={{ duration: 200 }}
							>
								<div class="pt-4">
									<p class="text-[14px] font-light leading-snug tracking-tight text-foreground">
										{model.title}
									</p>
									<p class="mt-3 text-[12.5px] font-light leading-relaxed text-muted-foreground">
										{model.summary}
									</p>
								</div>
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="min-w-0 w-full flex-1">
		<div class="relative">
			{#key activeModel.id}
				<div
					class="pointer-events-none absolute inset-0 z-10"
					in:fade={{ duration: 400 }}
					out:fade={{ duration: 400 }}
					style="filter: blur(0px)"
				></div>
			{/key}
			<SvelteFlowProvider>
				<div class="h-112 w-full">
					{#key activeModel.id}
						<SvelteFlow
							nodes={activeModel.nodes}
							edges={activeModel.edges}
							{nodeTypes}
							fitView
							fitViewOptions={{ padding: 0.2 }}
							nodesDraggable={false}
							nodesConnectable={false}
							elementsSelectable={false}
							panOnDrag={false}
							zoomOnScroll={false}
							zoomOnPinch={false}
							zoomOnDoubleClick={false}
							preventScrolling={false}
							proOptions={{ hideAttribution: true }}
						/>
					{/key}
				</div>
			</SvelteFlowProvider>
		</div>
	</div>
</div>
