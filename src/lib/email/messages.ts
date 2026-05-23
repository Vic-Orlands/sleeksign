import { renderEmailHtml, renderEmailText } from "./render-email";

export function buildResetPasswordEmail({
  url,
  userName,
}: {
  url: string;
  userName?: string | null;
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
}: {
  inviteUrl: string;
  organizationName: string;
  inviterName?: string | null;
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
