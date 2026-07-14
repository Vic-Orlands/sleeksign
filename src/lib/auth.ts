import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";

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
import { getOrganizationBranding, getWorkspaceBaseUrl } from "@/lib/branding";
import {
  buildInvitationEmail,
  buildResetPasswordEmail,
  buildWelcomeEmail,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send-email";

function getBaseUrl() {
  if (!process.env.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL is required");
  }

  return process.env.BETTER_AUTH_URL;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value!;
}

export const auth = betterAuth({
  appName: "SleekSign",
  secret: getRequiredEnv("BETTER_AUTH_SECRET"),
  baseURL: getBaseUrl(),
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
      const lastWorkspaceId = (user as { lastWorkspaceId?: string | null })
        .lastWorkspaceId;
      const branding = lastWorkspaceId
        ? await getOrganizationBranding(lastWorkspaceId)
        : undefined;
      const message = await buildResetPasswordEmail({
        url,
        userName: user.name,
        branding,
      });

      await sendTransactionalEmail({
        to: user.email,
        subject: message.subject,
        html: message.html,
        fromName: branding?.senderName,
      });
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const message = await buildWelcomeEmail({
              userName: user.name,
              workspaceUrl: getBaseUrl(),
            });
            await sendTransactionalEmail({
              to: user.email,
              subject: message.subject,
              html: message.html,
              fromName: "SleekSign",
            });
          } catch (error) {
            console.error("Failed to send welcome email:", error);
          }
        },
      },
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
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    },
  },
  plugins: [
    organization({
      sendInvitationEmail: async ({ id, email, organization, inviter }) => {
        const branding = await getOrganizationBranding(organization.id);
        const url = new URL(
          `/accept-invitation/${id}`,
          getWorkspaceBaseUrl(branding, getBaseUrl()),
        ).toString();

        const message = await buildInvitationEmail({
          inviteUrl: url,
          organizationName: organization.name,
          inviterName: inviter.user.name,
          branding,
        });

        await sendTransactionalEmail({
          to: email,
          subject: message.subject,
          html: message.html,
          fromName: branding?.senderName || organization.name,
        });
      },
    }),
    sveltekitCookies(getRequestEvent),
  ],
});
