import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { Resend } from "resend"

import { db } from "@/db"
import {
  authAccount,
  authInvitation,
  authMember,
  authOrganization,
  authSession,
  authUser,
  authVerification,
} from "@/db/schema"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function getBaseUrl() {
  return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const from = process.env.RESEND_FROM_EMAIL

  if (!resend || !from) {
    console.warn(`Email delivery skipped for ${to}. Configure RESEND_API_KEY and RESEND_FROM_EMAIL.`)
    console.info(text)
    return
  }

  await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  })
}

export const auth = betterAuth({
  appName: "SleekSign",
  secret: process.env.BETTER_AUTH_SECRET || "sleeksign-local-development-secret",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
      organization: authOrganization,
      member: authMember,
      invitation: authInvitation,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your SleekSign password",
        text: `Reset your SleekSign password by visiting ${url}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2 style="margin:0 0 12px">Reset your SleekSign password</h2>
          <p style="margin:0 0 12px">We received a request to reset your password.</p>
          <p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;padding:10px 14px;background:#111827;color:#ffffff;text-decoration:none">Reset Password</a></p>
          <p style="margin:0;color:#4b5563">If you did not request this, you can ignore this email.</p>
        </div>`,
      })
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "",
    },
  },
  plugins: [
    organization({
      sendInvitationEmail: async ({ id, email, organization, inviter }) => {
        const url = new URL(`/accept-invitation/${id}`, getBaseUrl()).toString()

        await sendEmail({
          to: email,
          subject: `Join ${organization.name} on SleekSign`,
          text: `${inviter.user.name} invited you to join ${organization.name} on SleekSign. Accept the invitation at ${url}`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2 style="margin:0 0 12px">Join ${organization.name}</h2>
            <p style="margin:0 0 12px">${inviter.user.name} invited you to collaborate in SleekSign.</p>
            <p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;padding:10px 14px;background:#111827;color:#ffffff;text-decoration:none">Accept Invitation</a></p>
            <p style="margin:0;color:#4b5563">This link opens the invitation acceptance flow for your workspace.</p>
          </div>`,
        })
      },
    }),
    nextCookies(),
  ],
})
