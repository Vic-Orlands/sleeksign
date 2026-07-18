import Clock from "phosphor-svelte/lib/Clock";
import Database from "phosphor-svelte/lib/Database";
import Ghost from "phosphor-svelte/lib/Ghost";
import GlobeSimple from "phosphor-svelte/lib/GlobeSimple";
import Hexagon from "phosphor-svelte/lib/Hexagon";
import Lightning from "phosphor-svelte/lib/Lightning";
import Sparkle from "phosphor-svelte/lib/Sparkle";
import Wrench from "phosphor-svelte/lib/Wrench";
import type { ScanNodeKind } from "$lib/codebase-scan";

export const scanKindStyles = {
	entry: {
		label: "Entry",
		icon: Lightning,
		color: "#64748b",
		className: "entry",
	},
	cron: {
		label: "Cron",
		icon: Clock,
		color: "#f59e0b",
		className: "cron",
	},
	agent: {
		label: "Agent",
		icon: Ghost,
		color: "#f97316",
		className: "agent",
	},
	model: {
		label: "Model",
		icon: Sparkle,
		color: "#3b82f6",
		className: "model",
	},
	tool: {
		label: "Tool",
		icon: Wrench,
		color: "#8b5cf6",
		className: "tool",
	},
	service: {
		label: "Service",
		icon: Hexagon,
		color: "#ec4899",
		className: "service",
	},
	store: {
		label: "Store",
		icon: Database,
		color: "#10b981",
		className: "store",
	},
	external: {
		label: "External",
		icon: GlobeSimple,
		color: "#0ea5e9",
		className: "external",
	},
} satisfies Record<
	ScanNodeKind,
	{
		label: string;
		icon: typeof Lightning;
		color: string;
		className: string;
	}
>;

export const scanKindOrder: ScanNodeKind[] = [
	"entry",
	"cron",
	"agent",
	"model",
	"tool",
	"service",
	"store",
	"external",
];

export const scanLegendGroups: Array<{
	label: string;
	kinds: ScanNodeKind[];
	kind: ScanNodeKind;
}> = [
	{ label: "Triggers", kinds: ["entry", "cron"], kind: "cron" },
	{ label: "Agents", kinds: ["agent"], kind: "agent" },
	{ label: "Services", kinds: ["service"], kind: "service" },
	{ label: "Stores", kinds: ["store"], kind: "store" },
	{ label: "External", kinds: ["external"], kind: "external" },
];
