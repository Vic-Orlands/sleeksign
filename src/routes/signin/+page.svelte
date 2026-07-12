<script lang="ts">
	import AuthPanel from "$lib/components/auth/auth-panel.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>Sign in — SleekSign</title>
</svelte:head>

<AuthPanel mode="signin" nextPath={data.next} />
