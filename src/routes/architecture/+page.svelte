<script lang="ts">
	import ScanBoard from "$lib/components/codebase-scan/scan-board.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.scan.project.name} Architecture • SleekSign</title>
	<meta
		name="description"
		content={`A living architecture map of ${data.scan.project.name}.`}
	/>
	<meta
		property="og:title"
		content={`${data.scan.project.name} Architecture`}
	/>
	<meta
		property="og:description"
		content={`A living architecture map of ${data.scan.project.name}.`}
	/>
	<meta property="og:type" content="website" />
</svelte:head>

<ScanBoard data={data.scan} />
