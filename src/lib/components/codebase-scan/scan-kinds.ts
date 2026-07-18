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
		className: "bg-muted text-foreground",
	},
	cron: {
		label: "Cron",
		icon: Clock,
		color: "#f59e0b",
		className: "bg-amber-500/10 text-amber-500",
	},
	agent: {
		label: "Agent",
		icon: Ghost,
		color: "#f97316",
		className: "bg-orange-500/10 text-orange-500",
	},
	model: {
		label: "Model",
		icon: Sparkle,
		color: "#3b82f6",
		className: "bg-blue-500/10 text-blue-500",
	},
	tool: {
		label: "Tool",
		icon: Wrench,
		color: "#8b5cf6",
		className: "bg-violet-500/10 text-violet-500",
	},
	service: {
		label: "Service",
		icon: Hexagon,
		color: "#ec4899",
		className: "bg-pink-500/10 text-pink-500",
	},
	store: {
		label: "Store",
		icon: Database,
		color: "#10b981",
		className: "bg-emerald-500/10 text-emerald-500",
	},
	external: {
		label: "External",
		icon: GlobeSimple,
		color: "#0ea5e9",
		className: "bg-sky-500/10 text-sky-500",
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
