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
import { addDaysUTC, mmdd, parseISO, pad2, nowInTZ } from "@/lib/when";
import { sendReminderEmail } from "@/lib/reminderEmail";
import { timingSafeEqual } from "crypto";

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

const allowedReminderDays = new Set([0, 1, 3, 7]);

function parseReminderDays(value: string) {
  const days = value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => allowedReminderDays.has(item));

  return [...new Set(days)].sort((a, b) => a - b);
}

function reminderLabel(day: number) {
  if (day === 0) return "Сегодня";
  if (day === 1) return "Завтра";
  return `Через ${day} дней`;
}

function leap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function birthdayMMDD(person: { date: string | null; birthMonth: number | null; birthDay: number | null }, targetY: number) {
  let m = person.birthMonth;
  let d = person.birthDay;

  if ((!m || !d) && person.date) {
    const parsed = parseISO(person.date);
    m = parsed.m;
    d = parsed.d;
  }

  if (!m || !d) return null;
  if (m === 2 && d === 29 && !leap(targetY)) d = 28;

  return `${pad2(m)}-${pad2(d)}`;
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

  let processed = 0, mailed = 0;

  for (const u of usrs) {
    processed++;

    const tz = u.timezone || "Europe/Moscow";
    if (!u.notificationsEnabled) continue;

    const t = nowInTZ(tz);
    if (t.h !== u.reminderHour) continue;

    const reminderDays = parseReminderDays(u.reminderDays);
    if (reminderDays.length === 0) continue;

    // достаём всех людей пользователя (можно оптимизировать SQL на сервере, но так проще и ясно)
    const people = await db.query.peopleTable.findMany({
      where: eq(peopleTable.userId, u.id),
      columns: { id: true, name: true, date: true, birthMonth: true, birthDay: true, birthYear: true, note: true },
    });

    const groups = reminderDays.map((day) => {
      const target = addDaysUTC(t.y, t.m, t.d, day);
      const targetMMDD = mmdd(target.y, target.m, target.d);
      const matches = people.filter((person) => birthdayMMDD(person, target.y) === targetMMDD);

      return {
        day,
        key: `D${day}`,
        label: reminderLabel(day),
        target,
        people: matches,
      };
    });

    if (groups.every((group) => group.people.length === 0)) continue;

    // проверка лога, чтобы не слать повторно за этот runDate
    const runDateISO = `${t.y}-${pad2(t.m)}-${pad2(t.d)}`;

    // для простоты проверим любую запись по D0/D1/D7; если нет — шлём и логируем все
    const already = await db.query.notificationLogs.findFirst({
      where: and(
        eq(notificationLogs.userId, u.id),
        eq(notificationLogs.runDate, runDateISO as any) // drizzle date cast
      ),
    });
    if (already) continue;
    const toMail = (arr: {
      name: string | null;
      date: string | null;
      birthMonth: number | null;
      birthDay: number | null;
      birthYear: number | null;
      note: string | null;
    }[], targetY: number) => arr
      .filter(p => p.name && (p.date || (p.birthMonth && p.birthDay)))
      .map(p => ({
        name: p.name as string,
        date: p.date ?? `${p.birthYear ?? targetY}-${pad2(p.birthMonth!)}-${pad2(p.birthDay!)}`,
        note: p.note ?? null,
      }))

    await sendReminderEmail(
      u.email,
      groups.map((group) => ({
        key: group.key,
        label: group.label,
        items: toMail(group.people, group.target.y),
      }))
    )
    mailed++;

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

  let sharedProcessed = 0, sharedMailed = 0;

  for (const member of sharedMembers) {
    sharedProcessed++;

    const tz = member.timezone || "Europe/Moscow";
    const t = nowInTZ(tz);
    if (t.h !== member.reminderHour) continue;

    const sharedPeople = await db.query.sharedCalendarBirthdays.findMany({
      where: eq(sharedCalendarBirthdays.calendarId, member.calendarId),
      columns: { id: true, name: true, date: true, birthMonth: true, birthDay: true, birthYear: true, note: true },
    });
    if (sharedPeople.length === 0) continue;

    const reminderDays = parseReminderDays(member.reminderDays);
    if (reminderDays.length === 0) continue;

    const groups = reminderDays.map((day) => {
      const target = addDaysUTC(t.y, t.m, t.d, day);
      const targetMMDD = mmdd(target.y, target.m, target.d);
      const matches = sharedPeople.filter((person) => birthdayMMDD(person, target.y) === targetMMDD);

      return {
        day,
        key: `D${day}`,
        label: `${member.calendarName}: ${reminderLabel(day)}`,
        target,
        people: matches,
      };
    });

    if (groups.every((group) => group.people.length === 0)) continue;

    const runDateISO = `${t.y}-${pad2(t.m)}-${pad2(t.d)}`;
    const already = await db.query.sharedNotificationLogs.findFirst({
      where: and(
        eq(sharedNotificationLogs.calendarId, member.calendarId),
        eq(sharedNotificationLogs.userId, member.userId),
        eq(sharedNotificationLogs.runDate, runDateISO as any)
      ),
    });
    if (already) continue;

    const toMail = (arr: {
      name: string;
      date: string | null;
      birthMonth: number;
      birthDay: number;
      birthYear: number | null;
      note: string | null;
    }[], targetY: number) => arr
      .map(p => ({
        name: p.name,
        date: p.date ?? `${p.birthYear ?? targetY}-${pad2(p.birthMonth)}-${pad2(p.birthDay)}`,
        note: p.note ?? null,
      }));

    await sendReminderEmail(
      member.email,
      groups.map((group) => ({
        key: group.key,
        label: group.label,
        items: toMail(group.people, group.target.y),
      }))
    );
    sharedMailed++;

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
    users: processed,
    mailed,
    sharedMembers: sharedProcessed,
    sharedMailed,
  });
}
