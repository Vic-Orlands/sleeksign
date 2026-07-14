type EmailBranding = {
	logoUrl?: string | null;
	primaryColor?: string;
	secondaryColor?: string;
	neutralColor?: string;
	accentColor?: string;
	bodyFont?: string;
	senderName?: string;
	supportEmail?: string | null;
};

type RenderEmailInput = {
	preheader: string;
	eyebrow?: string;
	headline: string;
	body: string[];
	ctaLabel: string;
	ctaUrl: string;
	supportNote: string;
	code?: string;
	branding?: EmailBranding;
};

type WelcomeEmailInput = {
	preheader: string;
	userName?: string | null;
	workspaceUrl: string;
	branding?: EmailBranding;
};

const FONT =
	'"Public Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';

/** SleekSign light theme tokens (zinc / paper). */
const THEME = {
	paper: "#fafafa",
	foreground: "#18181b",
	muted: "#71717a",
	border: "#e4e4e7",
	secondary: "#f4f4f5",
};

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function brandName(branding?: EmailBranding) {
	return branding?.senderName?.trim() || "SleekSign";
}

function resolveTokens(branding?: EmailBranding) {
	return {
		primary: branding?.primaryColor?.trim() || THEME.foreground,
		paper: branding?.neutralColor?.trim() || THEME.paper,
		mutedLabel: branding?.accentColor?.trim() || THEME.muted,
		font: branding?.bodyFont?.trim()
			? `"${branding.bodyFont.trim()}",${FONT}`
			: FONT,
	};
}

/**
 * Previous Linear-style transactional / OTP layout,
 * using SleekSign theme colors instead of indigo/blue.
 */
export function renderEmailHtml({
	preheader,
	eyebrow,
	headline,
	body,
	ctaLabel,
	ctaUrl,
	supportNote,
	code,
	branding,
}: RenderEmailInput) {
	const sender = brandName(branding);
	const { primary, paper, mutedLabel, font } = resolveTokens(branding);

	const paragraphs = body
		.map(
			(line) =>
				`<p style="font-size:15px;line-height:1.5;margin:0 0 15px;color:${THEME.foreground};font-family:${font}">${escapeHtml(line)}</p>`,
		)
		.join("");

	const codeBlock = code
		? `<p style="margin:8px 0 20px"><code style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700;padding:6px 10px 4px;background-color:${THEME.secondary};border:1px solid ${THEME.border};color:${THEME.foreground};font-size:22px;letter-spacing:0.08em;border-radius:0.25rem">${escapeHtml(code)}</code></p>`
		: "";

	const supportEmail = branding?.supportEmail
		? ` Contact ${escapeHtml(branding.supportEmail)} if you need help.`
		: "";

	const eyebrowHtml = eyebrow
		? `<p style="margin:16px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${mutedLabel}">${escapeHtml(eyebrow)}</p>`
		: "";

	const supportHtml = supportNote
		? `<p style="font-size:15px;line-height:1.5;margin:0;color:${THEME.muted};font-family:${font}">${escapeHtml(supportNote)}${supportEmail}</p>`
		: "";

	return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(headline)}</title>
  </head>
  <body style="background-color:${paper};margin:0;padding:0">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${escapeHtml(preheader)}</div>
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
      <tbody>
        <tr>
          <td style="background-color:${paper};font-family:${font}">
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto">
              <tbody>
                <tr>
                  <td style="padding:36px 24px 48px">
                    <p style="margin:0;font-size:18px;font-weight:600;letter-spacing:-0.4px;color:${THEME.foreground};font-family:${font}">${escapeHtml(sender)}</p>
                    ${eyebrowHtml}
                    <h1 style="font-size:24px;letter-spacing:-0.5px;line-height:1.3;font-weight:400;color:${THEME.muted};padding:12px 0 0;margin:0;font-family:${font}">${escapeHtml(headline)}</h1>
                    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tbody>
                        <tr>
                          <td style="padding:27px 0">
                            <a href="${escapeHtml(ctaUrl)}" style="line-height:100%;text-decoration:none;display:inline-block;max-width:100%;background-color:${primary};border-radius:0.25rem;font-weight:600;color:#ffffff;font-size:15px;text-align:center;padding:11px 23px;font-family:${font}" target="_blank">${escapeHtml(ctaLabel)}</a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    ${paragraphs}
                    ${codeBlock}
                    ${supportHtml}
                    <hr style="width:100%;border:none;border-top:1px solid ${THEME.border};margin:42px 0 26px" />
                    <a href="${escapeHtml(ctaUrl)}" style="color:${THEME.muted};text-decoration:none;font-size:14px;font-family:${font}" target="_blank">${escapeHtml(sender)}</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

export function renderWelcomeEmailHtml({
	preheader,
	userName,
	workspaceUrl,
	branding,
}: WelcomeEmailInput) {
	const sender = brandName(branding);
	const greeting = userName?.trim()
		? `Hi ${userName.trim()},`
		: "Welcome,";

	return renderEmailHtml({
		preheader,
		eyebrow: "Welcome",
		headline: "Your workspace is ready",
		body: [
			greeting,
			`${sender} is your signing workspace—prepare documents, place fields, share packets, and finish signatures in one place.`,
			"Your workspace is ready whenever you are.",
		],
		ctaLabel: "Open workspace",
		ctaUrl: workspaceUrl,
		supportNote: `${sender} helps teams prepare documents, track packets, and complete signatures together.`,
		branding,
	});
}

export function renderEmailText({
	headline,
	body,
	ctaLabel,
	ctaUrl,
	supportNote,
	code,
}: Omit<RenderEmailInput, "preheader" | "branding" | "eyebrow">) {
	return [
		headline,
		"",
		...body,
		...(code ? ["", `Code: ${code}`] : []),
		"",
		`${ctaLabel}: ${ctaUrl}`,
		"",
		supportNote,
	].join("\n");
}

export function renderWelcomeEmailText({
	userName,
	workspaceUrl,
}: {
	userName?: string | null;
	workspaceUrl: string;
}) {
	const greeting = userName?.trim() ? `Hi ${userName.trim()},` : "Welcome,";
	return [
		"Your workspace is ready",
		"",
		greeting,
		"",
		"SleekSign is your signing workspace—prepare documents, place fields, share packets, and finish signatures in one place.",
		"",
		`Open workspace: ${workspaceUrl}`,
	].join("\n");
}
