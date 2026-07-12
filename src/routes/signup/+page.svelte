<script lang="ts">
	import AuthPanel from "$lib/components/auth/auth-panel.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>Create account — SleekSign</title>
</svelte:head>

<AuthPanel mode="signup" nextPath={data.next} />
