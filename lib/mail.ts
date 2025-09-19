import { Resend } from "resend";
import { baseEmailHTML } from "./baseEmailHTML";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendVerifyEmail(to: string, url: string) {
  const subject = "Подтверждение регистрации — BDsite";
  const html = baseEmailHTML({
    title: "Добро пожаловать в BDsite!",
    description: "Нажмите кнопку ниже, чтобы подтвердить email и сразу войти. Ссылка действует 30 минут.",
    buttonText: "Подтвердить и войти",
    url,
    note: "Если вы не регистрировались на BDsite, просто удалите это письмо.",
  });

  await resend.emails.send({
    from: `BDsite <${process.env.MAIL_FROM!}>`,
    to,
    subject,
    text: `Перейдите для подтверждения и входа: ${url}\nСсылка действует 30 минут.`,
    html,
  });
}

export async function sendLoginEmail(to: string, url: string) {
  const subject = "Вход по ссылке — BDsite";
  const html = baseEmailHTML({
    title: "Вход в BDsite",
    description: "Для входа нажмите кнопку. Ссылка действует 15 минут и одноразовая.",
    buttonText: "Войти в BDsite",
    url,
    note: "Если это были не вы, просто проигнорируйте письмо.",
  });

  await resend.emails.send({
    from: `BDsite <${process.env.MAIL_FROM!}>`,
    to,
    subject,
    text: `Вход в BDsite по ссылке: ${url}\nСсылка действует 15 минут.`,
    html,
  });
}
