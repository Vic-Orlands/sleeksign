<script lang="ts">
	import { cn } from "$lib/utils";
	import type {
		DocumentSetupStatus,
		DocumentStatus,
		SigningEntryStatus,
	} from "$lib/components/docs/types";

	type Status =
		| DocumentStatus
		| DocumentSetupStatus
		| SigningEntryStatus
		| "Opened"
		| "Signed"
		| "Not Opened";

	let { status }: { status: Status } = $props();

	const label = $derived(
		status === "pending" ? "Pending" : status === "completed" ? "Completed" : status,
	);

	const tone = $derived(
		label === "Completed" || label === "Signed" || label === "Edited"
			? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
			: label === "In Progress" || label === "Opened"
				? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
				: label === "Needs Setup"
					? "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
					: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
	);
</script>

<span
	class={cn(
		"inline-flex items-center rounded-[8px] border px-2 py-0.5 text-[11px] font-medium",
		tone,
	)}
>
	{label}
</span>
