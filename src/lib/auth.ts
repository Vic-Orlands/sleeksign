import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"

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
      console.info(`SleekSign password reset for ${user.email}: ${url}`)
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
  plugins: [organization(), nextCookies()],
})
