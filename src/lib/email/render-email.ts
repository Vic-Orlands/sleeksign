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

/** Matches app tokens: Public Sans stack, zinc paper surface, near-black primary. */
const FONT =
	'"Public Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';

const COLORS = {
	paper: "#fafafa",
	document: "#ffffff",
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

function tokens(branding?: EmailBranding) {
	const primary = branding?.primaryColor?.trim() || COLORS.foreground;
	const paper = branding?.neutralColor?.trim() || COLORS.paper;
	const font = branding?.bodyFont?.trim()
		? `"${branding.bodyFont.trim()}",${FONT}`
		: FONT;
	return { primary, paper, font };
}

function primaryButton(label: string, url: string, background: string) {
	return `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
  <tbody>
    <tr>
      <td style="padding:28px 0 8px">
        <a href="${escapeHtml(url)}" style="line-height:100%;text-decoration:none;display:inline-block;max-width:100%;background-color:${background};border-radius:6px;font-weight:600;color:#ffffff;font-size:14px;text-align:center;padding:12px 20px;font-family:${FONT}" target="_blank">${escapeHtml(label)}</a>
      </td>
    </tr>
  </tbody>
</table>`;
}

/**
 * Transactional email matched to SleekSign UI: paper canvas, bordered white panel,
 * mono-style label, zinc type, solid near-black CTA.
 */
export function renderEmailHtml({
	preheader,
	headline,
	body,
	ctaLabel,
	ctaUrl,
	supportNote,
	code,
	branding,
}: RenderEmailInput) {
	const sender = brandName(branding);
	const { primary, paper, font } = tokens(branding);

	const paragraphs = body
		.map(
			(line) =>
				`<p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:${COLORS.foreground};font-family:${font}">${escapeHtml(line)}</p>`,
		)
		.join("");

	const codeBlock = code
		? `<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:8px 0 20px">
  <tbody>
    <tr>
      <td style="background-color:${COLORS.secondary};border:1px solid ${COLORS.border};border-radius:6px;padding:16px 18px;text-align:center">
        <p style="margin:0 0 8px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.muted}">Verification code</p>
        <code style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700;color:${COLORS.foreground};font-size:28px;letter-spacing:0.12em">${escapeHtml(code)}</code>
      </td>
    </tr>
  </tbody>
</table>`
		: "";

	const supportEmail = branding?.supportEmail
		? ` Contact ${escapeHtml(branding.supportEmail)} if you need help.`
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
          <td style="background-color:${paper};padding:40px 16px;font-family:${font}">
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;background-color:${COLORS.document};border:1px solid ${COLORS.border}">
              <tbody>
                <tr>
                  <td style="padding:32px 28px 36px">
                    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.muted}">${escapeHtml(sender)}</p>
                    <h1 style="font-size:22px;letter-spacing:-0.3px;line-height:1.3;font-weight:600;color:${COLORS.foreground};padding:20px 0 0;margin:0;font-family:${font}">${escapeHtml(headline)}</h1>
                    <div style="padding-top:18px">${paragraphs}</div>
                    ${codeBlock}
                    ${primaryButton(ctaLabel, ctaUrl, primary)}
                    ${
											supportNote
												? `<p style="font-size:13px;line-height:1.55;margin:24px 0 0;color:${COLORS.muted};font-family:${font}">${escapeHtml(supportNote)}${supportEmail}</p>`
												: supportEmail
													? `<p style="font-size:13px;line-height:1.55;margin:24px 0 0;color:${COLORS.muted};font-family:${font}">${supportEmail.trim()}</p>`
													: ""
										}
                    <hr style="width:100%;border:none;border-top:1px solid ${COLORS.border};margin:32px 0 20px" />
                    <p style="margin:0;font-size:12px;color:${COLORS.muted};font-family:${font}">${escapeHtml(sender)}</p>
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

/**
 * Welcome note using the same SleekSign paper / bordered-panel system.
 */
export function renderWelcomeEmailHtml({
	preheader,
	userName,
	workspaceUrl,
	branding,
}: WelcomeEmailInput) {
	const sender = brandName(branding);
	const { primary, paper, font } = tokens(branding);
	const greeting = userName?.trim()
		? `Hi ${escapeHtml(userName.trim())},`
		: "Welcome,";

	return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Welcome to ${escapeHtml(sender)}</title>
  </head>
  <body style="background-color:${paper};margin:0;padding:0">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${escapeHtml(preheader)}</div>
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
      <tbody>
        <tr>
          <td style="background-color:${paper};padding:40px 16px;font-family:${font};color:${COLORS.foreground}">
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;background-color:${COLORS.document};border:1px solid ${COLORS.border}">
              <tbody>
                <tr>
                  <td style="padding:36px 28px 40px">
                    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${COLORS.muted}">${escapeHtml(sender)}</p>
                    <h1 style="font-size:26px;line-height:1.2;letter-spacing:-0.4px;font-weight:600;color:${COLORS.foreground};margin:18px 0 0;font-family:${font}">Welcome aboard</h1>
                    <p style="font-size:15px;line-height:1.6;color:${COLORS.foreground};margin:22px 0 0;font-family:${font}">${greeting}</p>
                    <p style="font-size:15px;line-height:1.6;color:${COLORS.foreground};margin:14px 0 0;font-family:${font}">
                      ${escapeHtml(sender)} is your signing workspace—prepare documents, place fields, share packets, and finish signatures in one place.
                    </p>
                    <p style="font-size:15px;line-height:1.6;color:${COLORS.foreground};margin:14px 0 0;font-family:${font}">
                      Your workspace is ready whenever you are.
                    </p>
                    ${primaryButton("Open workspace", workspaceUrl, primary)}
                    <hr style="width:100%;border:none;border-top:1px solid ${COLORS.border};margin:32px 0 20px" />
                    <p style="margin:0;font-size:13px;line-height:1.55;color:${COLORS.muted};font-family:${font}">
                      ${escapeHtml(sender)} helps teams prepare documents, track packets, and complete signatures together.
                    </p>
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

export function renderEmailText({
	headline,
	body,
	ctaLabel,
	ctaUrl,
	supportNote,
	code,
}: Omit<RenderEmailInput, "preheader" | "branding">) {
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
		"Welcome aboard",
		"",
		greeting,
		"",
		"SleekSign is your signing workspace—prepare documents, place fields, share packets, and finish signatures in one place.",
		"",
		"Your workspace is ready whenever you are.",
		"",
		`Open workspace: ${workspaceUrl}`,
	].join("\n");
}
