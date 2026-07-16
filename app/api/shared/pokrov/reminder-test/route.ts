export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sharedCalendarBirthdays, users } from "@/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  SHARED_REMINDER_DAYS,
  buildEmptyReminderTestGroups,
  buildReminderEmailGroups,
  hasReminderEmailItems,
  parseReminderDays,
  reminderLabel,
} from "@/lib/reminder-groups";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { ensurePokrovMember } from "@/lib/shared-calendar";
import { getSessionUser } from "@/lib/session";
import { nowInTZ } from "@/lib/when";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const limit = checkRateLimit(`pokrov-reminder-test:${session.id}:${ip}`, 3, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: limit.retryAfter },
      { status: 429 }
    );
  }

  const user = await db.query.users.findFirst({
    where: and(
      eq(users.id, session.id),
      eq(users.email, session.email),
      eq(users.isVerified, true)
    ),
    columns: { email: true },
  });

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { calendar, member } = await ensurePokrovMember(session.id);
  const currentDate = nowInTZ(member.timezone || "Europe/Moscow");
  const reminderDays = parseReminderDays(member.reminderDays, SHARED_REMINDER_DAYS);
  const birthdays = await db.query.sharedCalendarBirthdays.findMany({
    where: eq(sharedCalendarBirthdays.calendarId, calendar.id),
    columns: {
      name: true,
      date: true,
      birthMonth: true,
      birthDay: true,
      birthYear: true,
      note: true,
    },
  });

  const groups = buildReminderEmailGroups(
    birthdays,
    reminderDays,
    currentDate,
    (day) => `${calendar.name}: ${reminderLabel(day)}`
  );
  const matched = hasReminderEmailItems(groups);

  await sendReminderEmail(
    user.email,
    matched
      ? groups
      : buildEmptyReminderTestGroups(`${calendar.name}: проверка напоминаний`, currentDate)
  );

  return NextResponse.json({ ok: true, matched });
}
