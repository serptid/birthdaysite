// lib/reminderEmail.ts
import { baseEmailHTML } from "@/lib/mail";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendReminderEmail(to: string, nickname: string, groups: {
  D7: { name: string; date: string; note?: string | null }[],
  D1: { name: string; date: string; note?: string | null }[],
  D0: { name: string; date: string; note?: string | null }[],
}) {
  const has = (k: "D7"|"D1"|"D0") => groups[k] && groups[k].length > 0;
  const lines = (arr: {name:string;date:string;note?:string|null}[]) =>
    arr.map(x => `• ${x.name} — ${x.date}${x.note ? ` (${x.note})` : ""}`).join("<br/>");

  const parts: string[] = [];
  if (has("D0")) parts.push(`<strong>Сегодня:</strong><br/>${lines(groups.D0)}`);
  if (has("D1")) parts.push(`<strong>Завтра:</strong><br/>${lines(groups.D1)}`);
  if (has("D7")) parts.push(`<strong>Через 7 дней:</strong><br/>${lines(groups.D7)}`);

  if (parts.length === 0) return;

  const html = baseEmailHTML({
    title: `Напоминания для ${nickname}`,
    description: `Подборка ближайших дней рождения.`,
    buttonText: "Открыть BDsite",
    url: process.env.APP_URL!,
    note: parts.join("<div style='height:12px'></div>"),
  });

  await resend.emails.send({
    from: `BDsite <${process.env.MAIL_FROM!}>`,
    to,
    subject: "BDsite — напоминания о днях рождения",
    text: "Проверьте календарь на bdsite.ru",
    html,
  });
}
