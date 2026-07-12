type RenderEmailInput = {
  preheader: string;
  eyebrow: string;
  headline: string;
  body: string[];
  ctaLabel: string;
  ctaUrl: string;
  supportNote: string;
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    neutralColor?: string;
    accentColor?: string;
    bodyFont?: string;
    senderName?: string;
    supportEmail?: string | null;
  };
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
  branding,
}: RenderEmailInput) {
  const senderName = branding?.senderName || "SleekSign";
  const primaryColor = branding?.primaryColor || "#18181b";
  const secondaryColor = branding?.secondaryColor || "#f97316";
  const neutralColor = branding?.neutralColor || "#f7f5f1";
  const accentColor = branding?.accentColor || "#ea580c";
  const bodyFont = branding?.bodyFont || "Inter";

  const paragraphs = body
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-family:${bodyFont},'Inter',sans-serif;font-size:15px;line-height:1.65;color:#4b5563;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const logo = branding?.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(senderName)}" style="display:block;height:36px;width:auto;margin:0 0 24px;border:none;" />`
    : "";

  const supportLine = branding?.supportEmail
    ? `${supportNote} Contact ${branding.supportEmail} if you need help.`
    : supportNote;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(headline)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    <style>
      @media screen and (max-width: 600px) {
        .container {
          padding: 24px 12px !important;
        }
        .card {
          border-radius: 8px !important;
        }
        .card-body {
          padding: 36px 24px !important;
        }
        .headline {
          font-size: 32px !important;
          line-height: 1.15 !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:${neutralColor};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background-color:${neutralColor};width:100%;height:100%;margin:0;padding:0;">
      <tr>
        <td align="center" style="vertical-align:top;padding:48px 16px;" class="container">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border-collapse:collapse;text-align:left;">
            <tr>
              <td style="padding-bottom:24px;">
                ${logo ? logo : `<div style="font-family:'Outfit','Inter',sans-serif;font-size:22px;font-weight:700;color:${primaryColor};letter-spacing:-0.03em;">${escapeHtml(senderName)}</div>`}
              </td>
            </tr>
            <tr>
              <td>
                <table class="card" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02);overflow:hidden;border-collapse:collapse;">
                  <tr>
                    <td style="padding:48px 40px;" class="card-body">
                      <!-- Eyebrow -->
                      <p style="margin:0 0 12px;font-family:${bodyFont},'Inter',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:${secondaryColor};">${escapeHtml(eyebrow)}</p>
                      
                      <!-- Headline -->
                      <h1 class="headline" style="margin:0 0 24px;font-family:'Outfit',${bodyFont},sans-serif;font-size:38px;font-weight:700;line-height:1.15;letter-spacing:-0.02em;color:${primaryColor};">${escapeHtml(headline)}</h1>
                      
                      <!-- Paragraphs -->
                      <div style="margin-bottom:28px;">
                        ${paragraphs}
                      </div>
                      
                      <!-- Button CTA -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px;margin-bottom:32px;border-collapse:collapse;">
                        <tr>
                          <td>
                            <a href="${ctaUrl}" style="display:inline-block;background-color:${primaryColor};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,0.06);letter-spacing:-0.01em;">${escapeHtml(ctaLabel)}</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Support Note / Verification Security Block -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:32px;">
                        <tr>
                          <td style="background-color:#f8fafc;border-left:3px solid ${accentColor};padding:14px 18px;border-radius:0 6px 6px 0;">
                            <p style="margin:0;font-family:'Inter',sans-serif;font-size:12px;line-height:1.6;color:#64748b;">${escapeHtml(supportLine)}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Divider -->
                      <hr style="margin:40px 0 32px;border:0;border-top:1px solid #f1f5f9;" />
                      
                      <!-- Footer Description -->
                      <p style="margin:0 0 20px;font-family:'Inter',sans-serif;font-size:12px;line-height:1.65;color:#64748b;max-width:400px;">
                        ${escapeHtml(senderName)} is the secure signature workspace where teams get documents signed, track progress, and complete workflows together.
                      </p>
                      
                      <!-- Footer Social Links -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:24px;">
                        <tr>
                          <td style="padding-right:16px;">
                            <a href="https://x.com" target="_blank" style="display:inline-block;text-decoration:none;">
                              <img src="https://img.icons8.com/ios-filled/32/64748b/twitterx.png" alt="X" width="16" height="16" style="display:block;border:none;" />
                            </a>
                          </td>
                          <td style="padding-right:16px;">
                            <a href="https://linkedin.com" target="_blank" style="display:inline-block;text-decoration:none;">
                              <img src="https://img.icons8.com/ios-filled/32/64748b/linkedin.png" alt="LinkedIn" width="16" height="16" style="display:block;border:none;" />
                            </a>
                          </td>
                          <td style="padding-right:16px;">
                            <a href="https://github.com" target="_blank" style="display:inline-block;text-decoration:none;">
                              <img src="https://img.icons8.com/ios-filled/32/64748b/github.png" alt="GitHub" width="16" height="16" style="display:block;border:none;" />
                            </a>
                          </td>
                          <td>
                            <a href="https://youtube.com" target="_blank" style="display:inline-block;text-decoration:none;">
                              <img src="https://img.icons8.com/ios-filled/32/64748b/youtube-play.png" alt="YouTube" width="16" height="16" style="display:block;border:none;" />
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Footer Address / Info -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td>
                            <p style="margin:0 0 12px;font-family:'Inter',sans-serif;font-size:11px;line-height:1.5;color:#94a3b8;">
                              123 Market Street, Floor 1<br />
                              Tech City, CA, 94102
                            </p>
                            <p style="margin:0;font-family:'Inter',sans-serif;font-size:11px;color:#94a3b8;">
                              Want to manage your workspace settings? <a href="${ctaUrl}" style="color:#64748b;text-decoration:underline;font-weight:500;">Access account</a>.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
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
  return [
    headline,
    "",
    ...body,
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    supportNote,
  ].join("\n");
}
