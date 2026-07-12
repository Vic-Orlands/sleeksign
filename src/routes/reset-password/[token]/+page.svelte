<script lang="ts">
	import AuthPanel from "$lib/components/auth/auth-panel.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>Reset password — SleekSign</title>
</svelte:head>

<AuthPanel mode="reset" token={data.token} nextPath={data.next} />
