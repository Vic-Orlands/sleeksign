import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import {
  authAccount,
  authInvitation,
  authMember,
  authOrganization,
  authSession,
  authUser,
  authVerification,
} from "@/db/schema";
import { buildInvitationEmail, buildResetPasswordEmail } from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send-email";

function getBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000"
  );
}

export const auth = betterAuth({
  appName: "SleekSign",
  secret:
    process.env.BETTER_AUTH_SECRET || "sleeksign-local-development-secret",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
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
      const message = buildResetPasswordEmail({
        url,
        userName: user.name,
      });

      await sendTransactionalEmail({
        to: user.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    },
  },
  user: {
    additionalFields: {
      lastWorkspaceId: {
        type: "string",
        required: false,
      },
    },
    deleteUser: {
      enabled: true,
    },
  },
  socialProviders: {
    google: {
      clientId:
        process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ||
        process.env.AUTH_GOOGLE_SECRET ||
        "",
    },
  },
  plugins: [
    organization({
      sendInvitationEmail: async ({ id, email, organization, inviter }) => {
        const url = new URL(
          `/accept-invitation/${id}`,
          getBaseUrl(),
        ).toString();

        const message = buildInvitationEmail({
          inviteUrl: url,
          organizationName: organization.name,
          inviterName: inviter.user.name,
        });

        await sendTransactionalEmail({
          to: email,
          subject: message.subject,
          html: message.html,
          text: message.text,
        });
      },
    }),
    nextCookies(),
  ],
});
