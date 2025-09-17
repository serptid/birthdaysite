// lib/mail.ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY!);

function baseEmailHTML(opts: {
  title: string;
  description: string;
  buttonText: string;
  url: string;
  note?: string;
  project?: string;
}) {
  const { title, description, buttonText, url, note, project = "BDsite" } = opts;
  return `
<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${title}</title>
  <style>
    body,table,td,a{ text-size-adjust:100% }
    table,td{ border-collapse:collapse!important }
    img{ border:0; line-height:100%; outline:none; text-decoration:none }
    body{ margin:0; padding:0; width:100%!important; background:#0b0b0c }
    .container{ max-width:560px; margin:0 auto; padding:24px 16px }
    .card{ background:#141417; border:1px solid #2a2a2e; border-radius:12px; padding:24px }
    .title{ margin:0 0 8px; font:600 22px/1.25 system-ui,-apple-system,Segoe UI,Roboto,Inter; color:#e7e7ea }
    .desc{ margin:0 0 20px; color:#a7a7ad; font:400 14px/1.6 system-ui,-apple-system,Segoe UI,Roboto,Inter }
    .btn-wrap{ margin:18px 0 }
    .btn{
      display:inline-block; background:#3b82f6; color:#fff!important; text-decoration:none;
      padding:12px 18px; border-radius:10px; font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,Inter;
      box-shadow:0 6px 14px rgba(59,130,246,.28)
    }
    .sep{ height:1px; background:#2a2a2e; margin:24px 0 }
    .fallback{ word-break:break-all; color:#a7a7ad; font:12px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Inter }
    .footer{ color:#a7a7ad; font:12px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Inter }
    @media (prefers-color-scheme: light){
      body{ background:#ffffff }
      .card{ background:#f8fafc; border:1px solid #e5e7eb }
      .title{ color:#0b0b0c } .desc,.fallback,.footer{ color:#374151 }
      .sep{ background:#e5e7eb }
      .btn{ background:#2563eb; box-shadow:0 6px 14px rgba(37,99,235,.22) }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1 class="title">${title}</h1>
      <p class="desc">${description}</p>
      <p class="btn-wrap">
        <a class="btn" href="${url}" target="_blank" rel="noopener">${buttonText}</a>
      </p>

      ${note ? `<p class="desc" style="margin-top:0">${note}</p>` : ""}

      <div class="sep"></div>

      <p class="fallback">
        Если кнопка не работает, скопируйте ссылку и откройте в браузере:
        <br /><a href="${url}" style="color:#3b82f6; text-decoration:none">${url}</a>
      </p>

      <div class="sep"></div>

      <p class="footer">
        Вы получили это письмо, потому что выполняли действие на ${project}.
        Если это были не вы, проигнорируйте сообщение.
      </p>
    </div>
    <p class="footer" style="text-align:center; margin-top:16px">© ${new Date().getFullYear()} ${project}</p>
  </div>
</body>
</html>`;
}

export async function sendVerifyEmail(to: string, url: string) {
  const subject = "Подтверждение email — BDsite";
  const html = baseEmailHTML({
    title: "Подтвердите email",
    description: "Нажмите кнопку ниже, чтобы активировать аккаунт. Ссылка действует 30 минут.",
    buttonText: "Подтвердить email",
    url,
    note: "Если вы не регистрировались на BDsite, просто удалите это письмо.",
  });

  await resend.emails.send({
    from: `BDsite <${process.env.MAIL_FROM!}>`,
    to,
    subject,
    text: `Подтвердите email: ${url}\nСсылка действует 30 минут.`,
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
