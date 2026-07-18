<script lang="ts">
	import ScanBoard from "$lib/components/codebase-scan/scan-board.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.scan.project.name} • SleekSign Scan</title>
	<meta
		name="description"
		content={`A living map of ${data.scan.project.name}.`}
	/>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<ScanBoard data={data.scan} />
