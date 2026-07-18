import type { BrandingTokenSet } from "@/lib/branding";
import {
  renderInvitationEmailHtml,
  renderOtpEmailHtml,
  renderWelcomeEmailHtml,
} from "./render-email";

function withBranding(branding?: Partial<BrandingTokenSet>) {
  return branding
    ? {
        senderName: branding.senderName || "SleekSign",
        supportEmail: branding.supportEmail || null,
      }
    : { senderName: "SleekSign" };
}

export async function buildResetPasswordEmail({
  url,
  userName,
  branding,
}: {
  url: string;
  userName?: string | null;
  branding?: Partial<BrandingTokenSet>;
}) {
  const subject = "Reset your SleekSign password";
  const headline = "Your password reset link for SleekSign";
  const body = userName
    ? `Hi ${userName}, this link will only be valid for a limited time. If you did not request a password reset, you can safely ignore this email.`
    : "This link will only be valid for a limited time. If you did not request a password reset, you can safely ignore this email.";
  const supportNote =
    "If you did not request a password reset, you can safely ignore this email.";

  return {
    subject,
    html: await renderOtpEmailHtml({
      preheader: subject,
      headline,
      body: [body],
      ctaLabel: "Reset password",
      ctaUrl: url,
      supportNote,
      branding: withBranding(branding),
    }),
  };
}

export async function buildInvitationEmail({
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
  const body = [
    inviterName
      ? `${inviterName} invited you to join ${organizationName} on SleekSign.`
      : `You have been invited to join ${organizationName} on SleekSign.`,
    "Accept the invitation to access the workspace and start collaborating on documents and signing packets.",
    "If you were not expecting this invitation, you can ignore this email.",
  ];
  const subject = `Join ${organizationName} on SleekSign`;
  const headline = `Your invitation to ${organizationName}`;
  const supportNote =
    "This invitation link opens the acceptance flow for your SleekSign workspace.";

  return {
    subject,
    html: await renderInvitationEmailHtml({
      preheader: subject,
      headline,
      body,
      ctaLabel: "Accept invitation",
      ctaUrl: inviteUrl,
      supportNote,
      branding: withBranding(branding),
    }),
  };
}

export async function buildSignerOtpEmail({
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
  const subject = "Verification code";
  const headline = `Your OTP code to continue as ${roleName}.`;
  const body = [
    "This link and code will only be valid for the next 10 minutes. If the link does not work, you can use this one-time code directly:",
  ];

  return {
    subject,
    html: await renderOtpEmailHtml({
      preheader: subject,
      headline,
      body,
      ctaLabel: "Open Signing Session",
      ctaUrl: baseUrl,
      code,
      branding: withBranding(branding),
    }),
  };
}

export async function buildDomainRequestEmail({
  hostname,
  txtName,
  txtValue,
  workspaceName,
  settingsUrl,
}: {
  hostname: string;
  txtName: string;
  txtValue: string;
  workspaceName: string;
  settingsUrl: string;
}) {
  const subject = `Domain verification requested: ${hostname}`;

  return {
    subject,
    html: await renderOtpEmailHtml({
      preheader: subject,
      headline: `Verify ${hostname} for ${workspaceName}.`,
      body: [
        `${workspaceName} requested this custom domain. Add a DNS TXT record with the name ${txtName}.`,
        "Use the value shown below. After DNS propagates, return to SleekSign and click Check DNS.",
      ],
      ctaLabel: "Review domain request",
      ctaUrl: settingsUrl,
      code: txtValue,
      supportNote:
        "SleekSign will activate the domain only after the published TXT value matches this request.",
      branding: { senderName: "SleekSign" },
    }),
  };
}

export async function buildBulkSendInviteEmail({
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
  const headline = "Your document is ready to review";
  const body = [
    `Hi ${signerName}, you have been asked to sign ${documentName} as ${roleName}.`,
    "Open the secure signing session to review the document, complete your assigned fields, and finish signing.",
    "This link is unique to your recipient copy.",
  ];
  const supportNote =
    "Your signing link opens only the fields assigned to your role.";

  return {
    subject,
    html: await renderInvitationEmailHtml({
      preheader: subject,
      headline,
      body,
      ctaLabel: "Open document",
      ctaUrl: inviteUrl,
      supportNote,
      branding: withBranding(branding),
    }),
  };
}

export async function buildWelcomeEmail({
  userName,
  workspaceUrl,
  branding,
}: {
  userName?: string | null;
  workspaceUrl: string;
  branding?: Partial<BrandingTokenSet>;
}) {
  const subject = "A short note from the SleekSign team";
  const sender = branding?.senderName || "SleekSign";
  const headline = "A note from us";
  const body = [
    userName?.trim() ? `Hi ${userName.trim()},` : "Welcome,",
    `We don't send long emails often—when we do, we want them to feel direct. No hero image, no noise: just a quick word from the team behind ${sender}.`,
    `We're building ${sender} so your team can prepare documents, place fields, share packets, and finish signatures in one place. What we hear from you shapes what we ship next.`,
    "Here's to fewer tabs and clearer handoffs. When you're ready to dive back in, we'll be there.",
    `— The ${sender} team`,
  ];
  const supportNote = `${sender} is the workspace where your team prepares documents, tracks signing packets, and completes signatures together—from first draft to final agreement.`;

  return {
    subject,
    html: await renderWelcomeEmailHtml({
      preheader: subject,
      headline,
      body,
      ctaLabel: "Open workspace",
      ctaUrl: workspaceUrl,
      supportNote,
      branding: withBranding(branding),
    }),
  };
}
