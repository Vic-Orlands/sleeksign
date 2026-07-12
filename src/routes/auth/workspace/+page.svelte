<script lang="ts">
	import WorkspaceSelector from "$lib/components/auth/workspace-selector.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>Choose workspace — SleekSign</title>
</svelte:head>

<WorkspaceSelector nextPath={data.next} />
