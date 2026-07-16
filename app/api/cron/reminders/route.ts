// app/api/cron/reminders/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  users,
  peopleTable,
  notificationLogs,
  sharedCalendars,
  sharedCalendarMembers,
  sharedCalendarBirthdays,
  sharedNotificationLogs,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nowInTZ, pad2 } from "@/lib/when";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { timingSafeEqual } from "crypto";
import {
  ACCOUNT_REMINDER_DAYS,
  SHARED_REMINDER_DAYS,
  buildReminderEmailGroups,
  hasReminderEmailItems,
  parseReminderDays,
  reminderLabel,
} from "@/lib/reminder-groups";

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function authOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || !auth) return false;
  return safeEqual(auth, `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const usrs = await db.query.users.findMany({
    where: eq(users.isVerified, true),
    columns: {
      id: true,
      email: true,
      timezone: true,
      notificationsEnabled: true,
      reminderDays: true,
      reminderHour: true,
    },
  });

  const accountStats = {
    processed: 0,
    mailed: 0,
    skippedNotificationsDisabled: 0,
    skippedBeforeHour: 0,
    skippedNoReminderDays: 0,
    skippedNoBirthdays: 0,
    skippedAlreadySent: 0,
  };

  for (const u of usrs) {
    accountStats.processed++;

    const tz = u.timezone || "Europe/Moscow";
    if (!u.notificationsEnabled) {
      accountStats.skippedNotificationsDisabled++;
      continue;
    }

    const t = nowInTZ(tz);
    if (t.h < u.reminderHour) {
      accountStats.skippedBeforeHour++;
      continue;
    }

    const reminderDays = parseReminderDays(u.reminderDays, ACCOUNT_REMINDER_DAYS);
    if (reminderDays.length === 0) {
      accountStats.skippedNoReminderDays++;
      continue;
    }

    // достаём всех людей пользователя (можно оптимизировать SQL на сервере, но так проще и ясно)
    const people = await db.query.peopleTable.findMany({
      where: eq(peopleTable.userId, u.id),
      columns: { id: true, name: true, date: true, birthMonth: true, birthDay: true, birthYear: true, note: true },
    });

    const groups = buildReminderEmailGroups(people, reminderDays, t);

    if (!hasReminderEmailItems(groups)) {
      accountStats.skippedNoBirthdays++;
      continue;
    }

    // проверка лога, чтобы не слать повторно за этот runDate
    const runDateISO = `${t.y}-${pad2(t.m)}-${pad2(t.d)}`;

    // для простоты проверим любую запись по D0/D1/D7; если нет — шлём и логируем все
    const already = await db.query.notificationLogs.findFirst({
      where: and(
        eq(notificationLogs.userId, u.id),
        eq(notificationLogs.runDate, runDateISO as any) // drizzle date cast
      ),
    });
    if (already) {
      accountStats.skippedAlreadySent++;
      continue;
    }
    await sendReminderEmail(
      u.email,
      groups
    )
    accountStats.mailed++;

    // лог на каждую запись, чтобы можно было детальнее анализировать
    const rows = groups.flatMap((group) =>
      group.people.map(p => ({ userId: u.id, personId: p.id, kind: group.key, runDate: runDateISO }))
    );
    if (rows.length) {
      await db.insert(notificationLogs).values(rows).onConflictDoNothing();
    }
  }

  const sharedMembers = await db
    .select({
      calendarId: sharedCalendarMembers.calendarId,
      userId: sharedCalendarMembers.userId,
      timezone: sharedCalendarMembers.timezone,
      reminderDays: sharedCalendarMembers.reminderDays,
      reminderHour: sharedCalendarMembers.reminderHour,
      email: users.email,
      calendarName: sharedCalendars.name,
    })
    .from(sharedCalendarMembers)
    .innerJoin(users, eq(sharedCalendarMembers.userId, users.id))
    .innerJoin(sharedCalendars, eq(sharedCalendarMembers.calendarId, sharedCalendars.id))
    .where(
      and(
        eq(sharedCalendarMembers.notificationsEnabled, true),
        eq(users.isVerified, true)
      )
    );

  const sharedStats = {
    processed: 0,
    mailed: 0,
    skippedBeforeHour: 0,
    skippedNoConfiguredBirthdays: 0,
    skippedNoReminderDays: 0,
    skippedNoBirthdays: 0,
    skippedAlreadySent: 0,
  };

  for (const member of sharedMembers) {
    sharedStats.processed++;

    const tz = member.timezone || "Europe/Moscow";
    const t = nowInTZ(tz);
    if (t.h < member.reminderHour) {
      sharedStats.skippedBeforeHour++;
      continue;
    }

    const reminderDays = parseReminderDays(member.reminderDays, SHARED_REMINDER_DAYS);
    if (reminderDays.length === 0) {
      sharedStats.skippedNoReminderDays++;
      continue;
    }

    const sharedPeople = await db.query.sharedCalendarBirthdays.findMany({
      where: eq(sharedCalendarBirthdays.calendarId, member.calendarId),
      columns: { id: true, name: true, date: true, birthMonth: true, birthDay: true, birthYear: true, note: true },
    });
    if (sharedPeople.length === 0) {
      sharedStats.skippedNoConfiguredBirthdays++;
      continue;
    }

    const groups = buildReminderEmailGroups(
      sharedPeople,
      reminderDays,
      t,
      (day) => `${member.calendarName}: ${reminderLabel(day)}`
    );

    if (!hasReminderEmailItems(groups)) {
      sharedStats.skippedNoBirthdays++;
      continue;
    }

    const runDateISO = `${t.y}-${pad2(t.m)}-${pad2(t.d)}`;
    const already = await db.query.sharedNotificationLogs.findFirst({
      where: and(
        eq(sharedNotificationLogs.calendarId, member.calendarId),
        eq(sharedNotificationLogs.userId, member.userId),
        eq(sharedNotificationLogs.runDate, runDateISO as any)
      ),
    });
    if (already) {
      sharedStats.skippedAlreadySent++;
      continue;
    }

    await sendReminderEmail(
      member.email,
      groups
    );
    sharedStats.mailed++;

    const rows = groups.flatMap((group) =>
      group.people.map(p => ({
        calendarId: member.calendarId,
        userId: member.userId,
        birthdayId: p.id,
        kind: group.key,
        runDate: runDateISO,
      }))
    );
    if (rows.length) {
      await db.insert(sharedNotificationLogs).values(rows).onConflictDoNothing();
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    users: accountStats.processed,
    mailed: accountStats.mailed,
    sharedMembers: sharedStats.processed,
    sharedMailed: sharedStats.mailed,
    accounts: accountStats,
    shared: sharedStats,
  });
}
