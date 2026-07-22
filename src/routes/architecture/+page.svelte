<script lang="ts">
	import ScanBoard from "$lib/components/codebase-scan/scan-board.svelte";

	let { data } = $props();
</script>

<ScanBoard data={data.scan} />
