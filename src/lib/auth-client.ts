"use client"

import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient()],
})

export async function saveLastWorkspaceId(lastWorkspaceId: string | null) {
  await authClient.$fetch("/update-user", {
    method: "POST",
    body: { lastWorkspaceId },
  })
}
