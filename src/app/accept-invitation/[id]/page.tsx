import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AcceptInvitationPanel } from "@/components/auth/accept-invitation-panel"
import { auth } from "@/lib/auth"

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect(`/signin?next=${encodeURIComponent(`/accept-invitation/${id}`)}`)
  }

  return <AcceptInvitationPanel invitationId={id} />
}
