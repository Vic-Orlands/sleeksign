<script lang="ts">
	import AcceptInvitationPanel from "$lib/components/auth/accept-invitation-panel.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>Accept invitation — SleekSign</title>
</svelte:head>

<AcceptInvitationPanel invitationId={data.invitationId} />
