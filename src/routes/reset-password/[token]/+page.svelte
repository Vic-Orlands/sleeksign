<script lang="ts">
	import AuthPanel from "$lib/components/auth/auth-panel.svelte";

	let { data } = $props();
</script>

<AuthPanel mode="reset" token={data.token} nextPath={data.next} />
