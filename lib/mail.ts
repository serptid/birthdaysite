import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendVerifyEmail(to: string, url: string) {
  await resend.emails.send({
    from: process.env.MAIL_FROM!,      // для теста: onboarding@resend.dev
    to,
    subject: "Подтверждение email",
    text: `Подтвердите email: ${url}`,
    html: `<p>Подтвердите email: <a href="${url}">${url}</a></p>`,
  });
}
