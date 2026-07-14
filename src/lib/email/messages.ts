import type { BrandingTokenSet } from "@/lib/branding";
import {
	renderEmailHtml,
	renderEmailText,
	renderWelcomeEmailHtml,
	renderWelcomeEmailText,
} from "./render-email";

function withBranding(branding?: Partial<BrandingTokenSet>) {
	return branding
		? {
				logoUrl: branding.logoUrl || null,
				primaryColor: branding.primaryColor,
				secondaryColor: branding.secondaryColor,
				neutralColor: branding.neutralColor,
				accentColor: branding.accentColor,
				bodyFont: branding.bodyFont,
				senderName: branding.senderName || "SleekSign",
				supportEmail: branding.supportEmail || null,
			}
		: { senderName: "SleekSign" };
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
		"This link will only be valid for a limited time. If you did not request this change, you can safely ignore this email.",
	];

	const subject = "Reset your SleekSign password";
	const headline = "Your password reset link for SleekSign";
	const supportNote =
		"If the button does not work, open the reset link from the email client preview or copy it from your account recovery flow.";

	return {
		subject,
		html: renderEmailHtml({
			preheader: subject,
			headline,
			body,
			ctaLabel: "Reset password",
			ctaUrl: url,
			supportNote,
			branding: withBranding(branding),
		}),
		text: renderEmailText({
			headline,
			body,
			ctaLabel: "Reset password",
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
		"Accept the invitation to access the workspace and start collaborating on documents and signing packets.",
		"If you were not expecting this invitation, you can ignore this email.",
	];

	const subject = `Join ${organizationName} on SleekSign`;
	const headline = `Your invitation to ${organizationName}`;
	const supportNote = "This invitation link opens the acceptance flow for your SleekSign workspace.";

	return {
		subject,
		html: renderEmailHtml({
			preheader: subject,
			headline,
			body,
			ctaLabel: "Accept invitation",
			ctaUrl: inviteUrl,
			supportNote,
			branding: withBranding(branding),
		}),
		text: renderEmailText({
			headline,
			body,
			ctaLabel: "Accept invitation",
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
			code,
			branding: withBranding(branding),
		}),
		text: renderEmailText({
			headline,
			body,
			ctaLabel: "Open Signing Session",
			ctaUrl: baseUrl,
			supportNote,
			code,
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
	const headline = `Your document is ready to review`;
	const body = [
		`Hi ${signerName}, you have been asked to sign ${documentName} as ${roleName}.`,
		"Open the secure signing session to review the document, complete your assigned fields, and finish signing.",
		"This link is unique to your recipient copy.",
	];
	const supportNote = "Your signing link opens only the fields assigned to your role.";

	return {
		subject,
		html: renderEmailHtml({
			preheader: subject,
			headline,
			body,
			ctaLabel: "Open document",
			ctaUrl: inviteUrl,
			supportNote,
			branding: withBranding(branding),
		}),
		text: renderEmailText({
			headline,
			body,
			ctaLabel: "Open document",
			ctaUrl: inviteUrl,
			supportNote,
		}),
	};
}

export function buildWelcomeEmail({
	userName,
	workspaceUrl,
	branding,
}: {
	userName?: string | null;
	workspaceUrl: string;
	branding?: Partial<BrandingTokenSet>;
}) {
	const subject = "A short note from the SleekSign team";

	return {
		subject,
		html: renderWelcomeEmailHtml({
			preheader: subject,
			userName,
			workspaceUrl,
			branding: withBranding(branding),
		}),
		text: renderWelcomeEmailText({
			userName,
			workspaceUrl,
		}),
	};
}
