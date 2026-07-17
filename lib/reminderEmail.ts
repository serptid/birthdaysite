// lib/reminderEmail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

type Item = {
  name: string;
  date: string;
  birthYear?: number | null;
  targetYear?: number;
  note?: string | null;
};

type ReminderGroup = { key: string; label: string; items: Item[] };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function yearWord(age: number) {
  const lastTwo = age % 100;
  const last = age % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "лет";
  if (last === 1) return "год";
  if (last >= 2 && last <= 4) return "года";
  return "лет";
}

function ageText(item: Item) {
  if (!item.birthYear || !item.targetYear) return "";

  const age = item.targetYear - item.birthYear;
  if (age < 0 || age > 130) return "";

  return `, исполняется ${age} ${yearWord(age)}`;
}

function splitLabel(label: string) {
  const parts = label.split(":").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { prefix: "", time: label.trim() };

  return {
    prefix: parts.slice(0, -1).join(": "),
    time: parts[parts.length - 1],
  };
}

function lowerFirst(value: string) {
  if (!value) return value;
  return value[0].toLowerCase() + value.slice(1);
}

function isEmptyTestItem(item: Item) {
  return item.name === "Дней рождений не назначено";
}

function buildLines(groups: ReminderGroup[]) {
  return groups.flatMap((group) => {
    const { prefix, time } = splitLabel(group.label);
    const prefixText = prefix ? `${prefix}: ` : "";

    return group.items.map((item) => {
      if (isEmptyTestItem(item)) {
        return `${prefixText}${item.note ?? "Это тестовое письмо. Дней рождений не назначено."}`;
      }

      const noteText = item.note ? ` Заметка: ${item.note}` : "";
      return `${prefixText}${time} день рождения у ${item.name}${ageText(item)}.${noteText}`;
    });
  });
}

function buildHtml(lines: string[], url: string) {
  const safeUrl = escapeHtml(url);

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>BDsite — напоминания</title>
</head>
<body style="margin:0; padding:24px; font:16px/1.5 Arial, sans-serif;">
  ${lines
    .map((line) => {
      const safeLine = escapeHtml(line);
      const [beforeName, afterName] = safeLine.split(" день рождения у ");

      if (!afterName) {
        return `<p style="margin:0 0 12px;">${safeLine}</p>`;
      }

      const sentenceStart = lowerFirst(beforeName);
      const nameMatch = afterName.match(/^([^,.]+)(.*)$/);
      const name = nameMatch?.[1] ?? afterName;
      const rest = nameMatch?.[2] ?? "";

      return `<p style="margin:0 0 12px;"><strong>${sentenceStart[0].toUpperCase() + sentenceStart.slice(1)} день рождения у</strong> <strong><em>${name}</em></strong>${rest}</p>`;
    })
    .join("\n  ")}
  <p style="margin:24px 0 0;">
    <a href="${safeUrl}" target="_blank" rel="noopener" style="display:inline-block; padding:10px 14px; border-radius:6px; background:#111; color:#fff; text-decoration:none;">Открыть BDsite</a>
  </p>
</body>
</html>`;
}

export async function sendReminderEmail(to: string, groups: ReminderGroup[]) {
  const activeGroups = groups.filter((group) => group.items.length > 0);
  if (activeGroups.length === 0) return;

  const url = process.env.APP_URL!;
  const lines = buildLines(activeGroups);
  const text = `${lines.join("\n")}\n\nОткрыть BDsite: ${url}`;
  const html = buildHtml(lines, url);

  const result = await resend.emails.send({
    from: `BDsite <${process.env.MAIL_FROM!}>`,
    to,
    subject: "BDsite — напоминания о днях рождения",
    text,
    html,
  });

  if (result.error) {
    throw new Error(`Resend reminder error: ${result.error.name}: ${result.error.message}`);
  }
}
