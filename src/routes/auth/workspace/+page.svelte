<script lang="ts">
	import WorkspaceSelector from "$lib/components/auth/workspace-selector.svelte";

	let { data } = $props();
</script>

<WorkspaceSelector nextPath={data.next} />
