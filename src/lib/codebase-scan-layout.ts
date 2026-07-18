import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk-api";
import type { ScanEdge } from "$lib/codebase-scan";

export type SizedScanNode = {
	id: string;
	width: number;
	height: number;
	group?: string;
};

export type PlacedScanNode<T extends SizedScanNode> = T & {
	x: number;
	y: number;
};

export type ScanGroupBox = {
	id: string;
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type ScanRenderedEdge = {
	from: string;
	to: string;
	label?: string;
	points: Array<{ x: number; y: number }>;
	labelPos?: { x: number; y: number };
	original: number[];
};

export type ScanLayout<T extends SizedScanNode> = {
	nodes: Array<PlacedScanNode<T>>;
	groups: ScanGroupBox[];
	edges: ScanRenderedEdge[];
	width: number;
	height: number;
};

const elk = new ELK();
const groupPadding = { top: 46, right: 16, bottom: 16, left: 16 };

function labelSize(label: string) {
	return { width: Math.round(label.length * 6) + 14, height: 22 };
}

export async function layoutScanGraph<T extends SizedScanNode>(
	nodes: T[],
	edges: ScanEdge[],
): Promise<ScanLayout<T>> {
	const byId = new Map(nodes.map((item) => [item.id, item]));
	const groupNames: string[] = [];
	const groupMembers = new Map<string, T[]>();

	for (const item of nodes) {
		if (!item.group) continue;
		if (!groupMembers.has(item.group)) {
			groupMembers.set(item.group, []);
			groupNames.push(item.group);
		}
		groupMembers.get(item.group)?.push(item);
	}

	const groupId = (name: string) => `group:${groupNames.indexOf(name)}`;
	const groupForNode = (id: string) => byId.get(id)?.group;
	const groupLayouts = new Map<
		string,
		{
			width: number;
			height: number;
			children: Map<string, { x: number; y: number }>;
			edges: Array<{
				original: number;
				points: Array<{ x: number; y: number }>;
				labelPos?: { x: number; y: number };
			}>;
		}
	>();

	for (const name of groupNames) {
		const members = groupMembers.get(name) || [];
		const memberIds = new Set(members.map((item) => item.id));
		const internal = edges
			.map((graphEdge, index) => ({ graphEdge, index }))
			.filter(
				({ graphEdge }) =>
					memberIds.has(graphEdge.from) && memberIds.has(graphEdge.to),
			);
		const input: ElkNode = {
			id: "root",
			layoutOptions: {
				"elk.algorithm": "layered",
				"elk.direction": "DOWN",
				"elk.edgeRouting": "ORTHOGONAL",
				"elk.layered.spacing.nodeNodeBetweenLayers": "30",
				"elk.spacing.nodeNode": "18",
				"elk.spacing.edgeNode": "14",
				"elk.edgeLabels.inline": "true",
				"elk.spacing.edgeLabel": "4",
				"elk.padding": `[top=${groupPadding.top},left=${groupPadding.left},bottom=${groupPadding.bottom},right=${groupPadding.right}]`,
			},
			children: members.map((item) => ({
				id: item.id,
				width: item.width,
				height: item.height,
			})),
			edges: internal.map(({ graphEdge, index }) => ({
				id: `e${index}`,
				sources: [graphEdge.from],
				targets: [graphEdge.to],
				...(graphEdge.label
					? {
							labels: [
								{
									id: `el${index}`,
									text: graphEdge.label,
									...labelSize(graphEdge.label),
								},
							],
						}
					: {}),
			})),
		};
		const result = await elk.layout(input);
		const children = new Map<string, { x: number; y: number }>();
		for (const child of result.children || []) {
			children.set(child.id, { x: child.x || 0, y: child.y || 0 });
		}
		groupLayouts.set(name, {
			width: result.width || 0,
			height: result.height || 0,
			children,
			edges: (result.edges || []).map((resultEdge) => {
				const section = resultEdge.sections?.[0];
				const label = resultEdge.labels?.[0];
				return {
					original: Number(resultEdge.id.slice(1)),
					points: section
						? [
								section.startPoint,
								...(section.bendPoints || []),
								section.endPoint,
							]
						: [],
					labelPos:
						label?.x !== undefined && label.y !== undefined
							? {
									x: label.x + (label.width || 0) / 2,
									y: label.y + (label.height || 0) / 2,
								}
							: undefined,
				};
			}),
		});
	}

	type RootEdge = {
		from: string;
		to: string;
		label?: string;
		original: number[];
	};
	const rootEdges = new Map<string, RootEdge>();
	edges.forEach((graphEdge, index) => {
		const fromGroup = groupForNode(graphEdge.from);
		const toGroup = groupForNode(graphEdge.to);
		if (fromGroup && fromGroup === toGroup) return;
		const from = fromGroup ? groupId(fromGroup) : graphEdge.from;
		const to = toGroup ? groupId(toGroup) : graphEdge.to;
		const key = `${from}→${to}`;
		const existing = rootEdges.get(key);
		if (existing) {
			existing.original.push(index);
			if (!existing.label && graphEdge.label) existing.label = graphEdge.label;
		} else {
			rootEdges.set(key, {
				from,
				to,
				label: graphEdge.label,
				original: [index],
			});
		}
	});

	const ungrouped = nodes.filter((item) => !item.group);
	const rootChildren: ElkNode[] = [
		...ungrouped.map((item) => ({
			id: item.id,
			width: item.width,
			height: item.height,
		})),
		...groupNames.map((name) => ({
			id: groupId(name),
			width: groupLayouts.get(name)?.width || 0,
			height: groupLayouts.get(name)?.height || 0,
		})),
	];
	const dense = rootChildren.length > 12;
	const rootEdgeList = [...rootEdges.values()];
	const rootInput: ElkNode = {
		id: "root",
		layoutOptions: {
			"elk.algorithm": "layered",
			"elk.direction": "RIGHT",
			"elk.edgeRouting": "ORTHOGONAL",
			"elk.layered.mergeEdges": "true",
			"elk.layered.spacing.nodeNodeBetweenLayers": "56",
			"elk.spacing.nodeNode": dense ? "18" : "26",
			"elk.spacing.edgeNode": dense ? "16" : "24",
			"elk.spacing.edgeEdge": "14",
			"elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
			"elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
			"elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
			"elk.edgeLabels.inline": "true",
			"elk.spacing.edgeLabel": "4",
			"elk.padding": "[top=16,left=16,bottom=16,right=16]",
		},
		children: rootChildren,
		edges: rootEdgeList.map((item, index) => ({
			id: `r${index}`,
			sources: [item.from],
			targets: [item.to],
			...(item.label
				? {
						labels: [
							{
								id: `rl${index}`,
								text: item.label,
								...labelSize(item.label),
							},
						],
					}
				: {}),
		})),
	};
	const rootResult = await elk.layout(rootInput);

	const rootPosition = new Map<string, { x: number; y: number }>();
	for (const child of rootResult.children || []) {
		rootPosition.set(child.id, { x: child.x || 0, y: child.y || 0 });
	}

	const rowDelta = new Map<string, number>();
	{
		const items = rootChildren
			.map((child) => {
				const position = rootPosition.get(child.id);
				return position
					? {
							id: child.id,
							height: child.height || 0,
							centerY: position.y + (child.height || 0) / 2,
						}
					: null;
			})
			.filter((item): item is NonNullable<typeof item> => item !== null)
			.sort((a, b) => a.centerY - b.centerY);
		let cluster: typeof items = [];
		const flush = () => {
			if (cluster.length < 2) return;
			const mean =
				cluster.reduce((sum, item) => sum + item.centerY, 0) /
				cluster.length;
			for (const item of cluster) {
				const delta = mean - item.centerY;
				if (delta === 0) continue;
				rowDelta.set(item.id, delta);
				const position = rootPosition.get(item.id)!;
				rootPosition.set(item.id, {
					x: position.x,
					y: position.y + delta,
				});
			}
		};
		for (const item of items) {
			if (
				cluster.length > 0 &&
				item.centerY - cluster[cluster.length - 1]!.centerY <= 20
			) {
				cluster.push(item);
			} else {
				flush();
				cluster = [item];
			}
		}
		flush();
	}

	function snapEdgePoints(
		points: Array<{ x: number; y: number }>,
		fromId: string,
		toId: string,
	) {
		const sourceDelta = rowDelta.get(fromId) || 0;
		const targetDelta = rowDelta.get(toId) || 0;
		if (
			(sourceDelta === 0 && targetDelta === 0) ||
			points.length < 2
		) {
			return points;
		}
		const snapped = points.map((point) => ({ ...point }));
		const last = snapped.length - 1;
		const horizontal = (
			a: { y: number },
			b: { y: number },
		) => Math.abs(a.y - b.y) < 0.5;
		snapped[0]!.y += sourceDelta;
		snapped[last]!.y += targetDelta;
		if (snapped.length === 2) return snapped;
		if (horizontal(points[0]!, points[1]!) && snapped.length > 3) {
			snapped[1]!.y += sourceDelta;
		}
		if (
			horizontal(points[last - 1]!, points[last]!) &&
			snapped.length > 3
		) {
			snapped[last - 1]!.y += targetDelta;
		}
		if (snapped.length === 3) {
			if (horizontal(points[0]!, points[1]!)) {
				snapped[1]!.y += sourceDelta;
			} else if (horizontal(points[1]!, points[2]!)) {
				snapped[1]!.y += targetDelta;
			}
		}
		return snapped;
	}

	const placed: Array<PlacedScanNode<T>> = ungrouped.map((item) => ({
		...item,
		...(rootPosition.get(item.id) || { x: 0, y: 0 }),
	}));
	const groups: ScanGroupBox[] = [];
	const renderedEdges: ScanRenderedEdge[] = [];

	for (const name of groupNames) {
		const current = groupLayouts.get(name);
		if (!current) continue;
		const origin = rootPosition.get(groupId(name)) || { x: 0, y: 0 };
		groups.push({
			id: groupId(name),
			label: name,
			x: origin.x,
			y: origin.y,
			width: current.width,
			height: current.height,
		});
		for (const member of groupMembers.get(name) || []) {
			const position = current.children.get(member.id) || { x: 0, y: 0 };
			placed.push({
				...member,
				x: origin.x + position.x,
				y: origin.y + position.y,
			});
		}
		for (const internalEdge of current.edges) {
			const original = edges[internalEdge.original];
			if (!original) continue;
			renderedEdges.push({
				from: original.from,
				to: original.to,
				label: original.label,
				original: [internalEdge.original],
				points: internalEdge.points.map((point) => ({
					x: point.x + origin.x,
					y: point.y + origin.y,
				})),
				labelPos: internalEdge.labelPos
					? {
							x: internalEdge.labelPos.x + origin.x,
							y: internalEdge.labelPos.y + origin.y,
						}
					: undefined,
			});
		}
	}

	(rootResult.edges || []).forEach((resultEdge, index) => {
		const specification = rootEdgeList[index];
		const section = resultEdge.sections?.[0];
		const label = resultEdge.labels?.[0];
		if (!specification) return;
		renderedEdges.push({
			from: specification.from,
			to: specification.to,
			label: specification.label,
			original: specification.original,
			points: snapEdgePoints(
				section
					? [
						section.startPoint,
						...(section.bendPoints || []),
						section.endPoint,
					]
					: [],
				specification.from,
				specification.to,
			),
			labelPos:
				label?.x !== undefined && label.y !== undefined
					? {
							x: label.x + (label.width || 0) / 2,
							y:
								label.y +
								(label.height || 0) / 2 +
								((rowDelta.get(specification.from) || 0) +
									(rowDelta.get(specification.to) || 0)) /
									2,
						}
					: undefined,
		});
	});

	{
		const xOccupied: Interval[] = [];
		const yOccupied: Interval[] = [];
		for (const item of placed) {
			xOccupied.push([item.x, item.x + item.width]);
			yOccupied.push([item.y, item.y + item.height]);
		}
		for (const group of groups) {
			xOccupied.push([group.x, group.x + group.width]);
			yOccupied.push([group.y, group.y + group.height]);
		}
		for (const graphEdge of renderedEdges) {
			if (graphEdge.label && graphEdge.labelPos) {
				const dimensions = labelSize(graphEdge.label);
				xOccupied.push([
					graphEdge.labelPos.x - dimensions.width / 2,
					graphEdge.labelPos.x + dimensions.width / 2,
				]);
				yOccupied.push([
					graphEdge.labelPos.y - dimensions.height / 2,
					graphEdge.labelPos.y + dimensions.height / 2,
				]);
			}
			for (let index = 0; index < graphEdge.points.length - 1; index += 1) {
				const start = graphEdge.points[index]!;
				const end = graphEdge.points[index + 1]!;
				if (Math.abs(start.y - end.y) < 0.5) {
					yOccupied.push([start.y - 7, start.y + 7]);
				}
				if (Math.abs(start.x - end.x) < 0.5) {
					xOccupied.push([start.x - 7, start.x + 7]);
				}
			}
		}
		const remapX = buildBandRemap(xOccupied);
		const remapY = buildBandRemap(yOccupied);
		for (const item of placed) {
			item.x = remapX(item.x);
			item.y = remapY(item.y);
		}
		for (const group of groups) {
			group.x = remapX(group.x);
			group.y = remapY(group.y);
		}
		for (const graphEdge of renderedEdges) {
			for (const point of graphEdge.points) {
				point.x = remapX(point.x);
				point.y = remapY(point.y);
			}
			if (graphEdge.labelPos) {
				graphEdge.labelPos.x = remapX(graphEdge.labelPos.x);
				graphEdge.labelPos.y = remapY(graphEdge.labelPos.y);
			}
		}
	}

	let width = 0;
	let height = 0;
	for (const item of placed) {
		width = Math.max(width, item.x + item.width);
		height = Math.max(height, item.y + item.height);
	}
	for (const group of groups) {
		width = Math.max(width, group.x + group.width);
		height = Math.max(height, group.y + group.height);
	}

	return {
		nodes: placed,
		groups,
		edges: renderedEdges,
		width: width + 16,
		height: height + 16,
	};
}

type Interval = [number, number];

function buildBandRemap(occupied: Interval[]) {
	const sorted = occupied
		.filter(([start, end]) => end > start)
		.sort((a, b) => a[0] - b[0]);
	const merged: Interval[] = [];
	for (const interval of sorted) {
		const last = merged[merged.length - 1];
		if (last && interval[0] <= last[1]) {
			last[1] = Math.max(last[1], interval[1]);
		} else {
			merged.push([interval[0], interval[1]]);
		}
	}
	const cuts: Array<{ start: number; end: number }> = [];
	for (let index = 0; index < merged.length - 1; index += 1) {
		const start = merged[index]![1];
		const end = merged[index + 1]![0];
		if (end - start > 80) cuts.push({ start, end });
	}
	if (cuts.length === 0) return (value: number) => value;
	return (value: number) => {
		let output = value;
		for (const cut of cuts) {
			const length = cut.end - cut.start;
			if (value >= cut.end) {
				output -= length - 72;
			} else if (value > cut.start) {
				output -= (value - cut.start) * (1 - 72 / length);
			}
		}
		return output;
	};
}

export function roundedEdgePath(
	points: Array<{ x: number; y: number }>,
	radius = 56,
) {
	if (points.length === 0) return "";
	if (points.length < 3) {
		return points
			.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
			.join(" ");
	}
	const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
		Math.hypot(b.x - a.x, b.y - a.y);
	const toward = (
		from: { x: number; y: number },
		to: { x: number; y: number },
		amount: number,
	) => {
		const length = distance(from, to) || 1;
		return {
			x: from.x + ((to.x - from.x) / length) * amount,
			y: from.y + ((to.y - from.y) / length) * amount,
		};
	};
	let path = `M ${points[0]?.x} ${points[0]?.y}`;
	for (let index = 1; index < points.length - 1; index += 1) {
		const previous = points[index - 1]!;
		const point = points[index]!;
		const next = points[index + 1]!;
		const start = toward(point, previous, Math.min(radius, distance(previous, point) / 2));
		const end = toward(point, next, Math.min(radius, distance(point, next) / 2));
		path += ` L ${start.x} ${start.y} Q ${point.x} ${point.y} ${end.x} ${end.y}`;
	}
	const last = points[points.length - 1]!;
	return `${path} L ${last.x} ${last.y}`;
}

export function arrowPath(points: Array<{ x: number; y: number }>, length = 7) {
	if (points.length < 2) return "";
	const point = points[points.length - 1]!;
	const previous = points[points.length - 2]!;
	const angle = Math.atan2(point.y - previous.y, point.x - previous.x);
	const spread = 0.46;
	return `M ${point.x - length * Math.cos(angle - spread)} ${
		point.y - length * Math.sin(angle - spread)
	} L ${point.x} ${point.y} L ${
		point.x - length * Math.cos(angle + spread)
	} ${point.y - length * Math.sin(angle + spread)}`;
}

export function longestSegmentMidpoint(points: Array<{ x: number; y: number }>) {
	if (points.length === 0) return null;
	let bestIndex = 0;
	let bestLength = -1;
	for (let index = 0; index < points.length - 1; index += 1) {
		const currentLength = Math.hypot(
			points[index + 1]!.x - points[index]!.x,
			points[index + 1]!.y - points[index]!.y,
		);
		if (currentLength > bestLength) {
			bestLength = currentLength;
			bestIndex = index;
		}
	}
	return {
		x: (points[bestIndex]!.x + points[bestIndex + 1]!.x) / 2,
		y: (points[bestIndex]!.y + points[bestIndex + 1]!.y) / 2,
	};
}
