import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
};

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  fromName,
}: SendTransactionalEmailInput) {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not configured");
  }

  const response = await resend.emails.send({
    from: `SleekSign <${from}>`,
    to,
    subject,
    html,
  });

  if (response.error) {
    throw new Error(`Resend email delivery failed: ${response.error.message}`);
  }

  return response;
}
