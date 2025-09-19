// lib/reminderEmail.ts
import { baseEmailHTML } from "@/lib/mail";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type Item = { name: string; date: string; note?: string | null };

export async function sendReminderEmail(
  to: string,
  nickname: string,
  groups: { D7: Item[]; D1: Item[]; D0: Item[] }
) {
  const has = (k: "D7" | "D1" | "D0") => groups[k] && groups[k].length > 0;

  const namesOnly = (arr: Item[]) =>
    arr.map(x => `• ${x.name}${x.note ? ` (${x.note})` : ""}`).join("<br/>");

  const parts: string[] = [];
  if (has("D0")) parts.push(`<strong>Сегодня:</strong><br/>${namesOnly(groups.D0)}`);
  if (has("D1")) parts.push(`<strong>Завтра:</strong><br/>${namesOnly(groups.D1)}`);
  if (has("D7")) parts.push(`<strong>Через 7 дней:</strong><br/>${namesOnly(groups.D7)}`);

  if (parts.length === 0) return;

  const html = baseEmailHTML({
    title: `Напоминания для ${nickname}`,
    description: `Ближайшие дни рождения.`,
    buttonText: "Открыть BDsite",
    url: process.env.APP_URL!,
    note: parts.join("<div style='height:12px'></div>"),
  });

  const text = [
    has("D0") ? `Сегодня: ${groups.D0.map(x => x.name).join(", ")}` : "",
    has("D1") ? `Завтра: ${groups.D1.map(x => x.name).join(", ")}` : "",
    has("D7") ? `Через 7 дней: ${groups.D7.map(x => x.name).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  await resend.emails.send({
    from: `BDsite <${process.env.MAIL_FROM!}>`,
    to,
    subject: "BDsite — напоминания о днях рождения",
    text: text || "Проверьте календарь на bdsite.ru",
    html,
  });
}
