// lib/mail.ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendLoginEmail(to: string, url: string) {
  await resend.emails.send({
    from: `BDsite <${process.env.MAIL_FROM!}>`,
    to,
    subject: "Вход по ссылке — BDsite",
    text: `Перейдите для входа: ${url} (15 минут)`,
    html: `<p>Для входа нажмите:</p><p><a href="${url}">Войти в BDsite</a></p><p>Ссылка действует 15 минут.</p>`,
  });
}
