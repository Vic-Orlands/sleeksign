<script lang="ts">
	import AcceptInvitationPanel from "$lib/components/auth/accept-invitation-panel.svelte";

	let { data } = $props();
</script>

<AcceptInvitationPanel invitationId={data.invitationId} />
