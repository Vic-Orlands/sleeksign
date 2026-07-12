<script lang="ts">
	import AuthPanel from "$lib/components/auth/auth-panel.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>Forgot password — SleekSign</title>
</svelte:head>

<AuthPanel mode="forgot" nextPath={data.next} />
