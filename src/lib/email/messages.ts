import type { BrandingTokenSet } from "@/lib/branding";
import { renderEmailHtml, renderEmailText } from "./render-email";

function withBranding(branding?: Partial<BrandingTokenSet>) {
  return branding
    ? {
        logoUrl: branding.logoUrl || null,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        neutralColor: branding.neutralColor,
        accentColor: branding.accentColor,
        bodyFont: branding.bodyFont,
        senderName: branding.senderName,
        supportEmail: branding.supportEmail || null,
      }
    : undefined;
}

export function buildResetPasswordEmail({
  url,
  userName,
  branding,
}: {
  url: string;
  userName?: string | null;
  branding?: Partial<BrandingTokenSet>;
}) {
  const body = [
    userName
      ? `Hi ${userName}, we received a request to reset your SleekSign password.`
      : "We received a request to reset your SleekSign password.",
    "Use the button below to choose a new password and return to your workspace.",
    "If you did not request this change, you can safely ignore this email.",
  ];

  const subject = "Reset your SleekSign password";
  const headline = "Reset your password";
  const supportNote =
    "This link opens the secure password reset flow for your SleekSign account.";

  return {
    subject,
    html: renderEmailHtml({
      preheader: subject,
      eyebrow: "Password reset",
      headline,
      body,
      ctaLabel: "Reset Password",
      ctaUrl: url,
      supportNote,
      branding: withBranding(branding),
    }),
    text: renderEmailText({
      headline,
      body,
      ctaLabel: "Reset Password",
      ctaUrl: url,
      supportNote,
    }),
  };
}

export function buildInvitationEmail({
  inviteUrl,
  organizationName,
  inviterName,
  branding,
}: {
  inviteUrl: string;
  organizationName: string;
  inviterName?: string | null;
  branding?: Partial<BrandingTokenSet>;
}) {
  const inviterLine = inviterName
    ? `${inviterName} invited you to join ${organizationName} on SleekSign.`
    : `You have been invited to join ${organizationName} on SleekSign.`;

  const body = [
    inviterLine,
    "Open the invitation to access the workspace and start collaborating on documents, packets, and signer activity.",
    "If you were not expecting this invitation, you can ignore this email.",
  ];

  const subject = `Join ${organizationName} on SleekSign`;
  const headline = `Join ${organizationName}`;
  const supportNote =
    "This button opens the invitation acceptance flow for your SleekSign workspace.";

  return {
    subject,
    html: renderEmailHtml({
      preheader: subject,
      eyebrow: "Workspace invitation",
      headline,
      body,
      ctaLabel: "Accept Invitation",
      ctaUrl: inviteUrl,
      supportNote,
      branding: withBranding(branding),
    }),
    text: renderEmailText({
      headline,
      body,
      ctaLabel: "Accept Invitation",
      ctaUrl: inviteUrl,
      supportNote,
    }),
  };
}

export function buildSignerOtpEmail({
  code,
  roleName,
  baseUrl,
  branding,
}: {
  code: string;
  roleName: string;
  baseUrl: string;
  branding?: Partial<BrandingTokenSet>;
}) {
  const subject = `Your SleekSign verification code: ${code}`;
  const headline = "Verify before viewing";
  const body = [
    `Enter this 6-digit code to continue as ${roleName}.`,
    `Verification code: ${code}`,
    "The code expires in 10 minutes. If you did not request access, you can ignore this email.",
  ];
  const supportNote = "This one-time code protects access to the signing session.";

  return {
    subject,
    html: renderEmailHtml({
      preheader: subject,
      eyebrow: "Signer verification",
      headline,
      body,
      ctaLabel: "Open Signing Session",
      ctaUrl: baseUrl,
      supportNote,
      branding: withBranding(branding),
    }),
    text: renderEmailText({
      headline,
      body,
      ctaLabel: "Open Signing Session",
      ctaUrl: baseUrl,
      supportNote,
    }),
  };
}

export function buildBulkSendInviteEmail({
  branding,
  documentName,
  roleName,
  signerName,
  inviteUrl,
}: {
  branding?: Partial<BrandingTokenSet>;
  documentName: string;
  roleName: string;
  signerName: string;
  inviteUrl: string;
}) {
  const subject = `Signature requested: ${documentName}`;
  const headline = `Review ${documentName}`;
  const body = [
    `Hi ${signerName}, you have been asked to sign ${documentName} as ${roleName}.`,
    "Open the secure signing session to review the document, complete your assigned fields, and generate the final PDF.",
    "This link is unique to your recipient copy.",
  ];
  const supportNote = "Your signing link opens the document section assigned to your role.";

  return {
    subject,
    html: renderEmailHtml({
      preheader: subject,
      eyebrow: "Signature request",
      headline,
      body,
      ctaLabel: "Open Document",
      ctaUrl: inviteUrl,
      supportNote,
      branding: withBranding(branding),
    }),
    text: renderEmailText({
      headline,
      body,
      ctaLabel: "Open Document",
      ctaUrl: inviteUrl,
      supportNote,
    }),
  };
}
