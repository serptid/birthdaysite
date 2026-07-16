// lib/reminderEmail.ts
import { baseEmailHTML } from "@/lib/baseEmailHTML";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type Item = { name: string; date: string; note?: string | null };
type ReminderGroup = { key: string; label: string; items: Item[] };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendReminderEmail(
  to: string,
  groups: ReminderGroup[]
) {
  const namesOnly = (arr: Item[]) =>
    arr
      .map((x) => `• ${escapeHtml(x.name)}${x.note ? ` (${escapeHtml(x.note)})` : ""}`)
      .join("<br/>");

  const activeGroups = groups.filter((group) => group.items.length > 0);
  const parts = activeGroups.map((group) => `<strong>${escapeHtml(group.label)}:</strong><br/>${namesOnly(group.items)}`);

  if (parts.length === 0) return;

  const html = baseEmailHTML({
    title: `Напоминания BDsite`,
    description: `Ближайшие дни рождения.`,
    buttonText: "Открыть BDsite",
    url: process.env.APP_URL!,
    note: parts.join("<div style='height:12px'></div>"),
  });

  const text = [
    ...activeGroups.map((group) => `${group.label}: ${group.items.map(x => x.name).join(", ")}`),
  ].filter(Boolean).join("\n");

  const result = await resend.emails.send({
    from: `BDsite <${process.env.MAIL_FROM!}>`,
    to,
    subject: "BDsite — напоминания о днях рождения",
    text: text || "Проверьте календарь на bdsite.ru",
    html,
  });

  if (result.error) {
    throw new Error(`Resend reminder error: ${result.error.name}: ${result.error.message}`);
  }
}
