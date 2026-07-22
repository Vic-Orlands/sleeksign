<script lang="ts">
	import AuthPanel from "$lib/components/auth/auth-panel.svelte";

	let { data } = $props();
</script>

<AuthPanel mode="forgot" nextPath={data.next} />
