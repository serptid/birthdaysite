export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { peopleTable, users } from "@/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  ACCOUNT_REMINDER_DAYS,
  buildEmptyReminderTestGroups,
  buildReminderEmailGroups,
  hasReminderEmailItems,
  parseReminderDays,
} from "@/lib/reminder-groups";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { getSessionUser } from "@/lib/session";
import { nowInTZ } from "@/lib/when";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const limit = checkRateLimit(`reminder-test:${session.id}:${ip}`, 3, 10 * 60 * 1000);
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
    columns: {
      email: true,
      timezone: true,
      reminderDays: true,
    },
  });

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const currentDate = nowInTZ(user.timezone || "Europe/Moscow");
  const reminderDays = parseReminderDays(user.reminderDays, ACCOUNT_REMINDER_DAYS);
  const people = await db.query.peopleTable.findMany({
    where: eq(peopleTable.userId, session.id),
    columns: {
      name: true,
      date: true,
      birthMonth: true,
      birthDay: true,
      birthYear: true,
      note: true,
    },
  });

  const groups = buildReminderEmailGroups(people, reminderDays, currentDate);
  const matched = hasReminderEmailItems(groups);

  await sendReminderEmail(
    user.email,
    matched ? groups : buildEmptyReminderTestGroups("Проверка напоминаний", currentDate)
  );

  return NextResponse.json({ ok: true, matched });
}
