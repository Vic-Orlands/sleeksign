type RenderEmailInput = {
  preheader: string;
  eyebrow: string;
  headline: string;
  body: string[];
  ctaLabel: string;
  ctaUrl: string;
  supportNote: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderEmailHtml({
  preheader,
  eyebrow,
  headline,
  body,
  ctaLabel,
  ctaUrl,
  supportNote,
}: RenderEmailInput) {
  const paragraphs = body
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-family:Roboto,Arial,sans-serif;font-size:15px;line-height:1.7;color:#52525b;">${escapeHtml(line)}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SleekSign</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&family=Ruthie&display=swap" rel="stylesheet">
  </head>
  <body style="margin:0;background:#f7f5f1;padding:24px 12px;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 18px 0;">
                <span style="display:inline-block;background:#f97316;color:#fff;padding:8px 14px;border-radius:999px;font-family:Roboto,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;">SleekSign</span>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:28px;padding:36px 32px;box-shadow:0 12px 40px rgba(0,0,0,0.06);">
                <p style="margin:0 0 16px;font-family:Roboto,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#f97316;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0 0 18px;font-family:Roboto,Arial,sans-serif;font-size:32px;line-height:1.05;color:#18181b;">${escapeHtml(headline)}</h1>
                ${paragraphs}
                <div style="padding-top:8px;padding-bottom:18px;">
                  <a href="${ctaUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-family:Roboto,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;">${escapeHtml(ctaLabel)}</a>
                </div>
                <p style="margin:0;font-family:Roboto,Arial,sans-serif;font-size:13px;line-height:1.7;color:#71717a;">${escapeHtml(supportNote)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 8px 0 8px;text-align:center;">
                <p style="margin:0;font-family:Roboto,Arial,sans-serif;font-size:12px;line-height:1.6;color:#a1a1aa;">Sent from your SleekSign workspace.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
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
}: Omit<RenderEmailInput, "preheader" | "eyebrow">) {
  return [headline, "", ...body, "", `${ctaLabel}: ${ctaUrl}`, "", supportNote].join(
    "\n",
  );
}
