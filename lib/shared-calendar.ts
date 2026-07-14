import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  sharedCalendarMembers,
  sharedCalendars,
  users,
} from "@/db/schema";

export const POKROV_CALENDAR_SLUG = "pokrov";
export const POKROV_CALENDAR_NAME = "Народный хор Покров";
export const SHARED_REMINDER_DAYS = [0, 1, 7] as const;
const POKROV_ADMIN_EMAILS = new Set(
  ["psi200523@gmail.com", ...(process.env.POKROV_ADMIN_EMAILS ?? "").split(",")]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export type SharedBirthdayInput = {
  name: string;
  birthMonth: number;
  birthDay: number;
  birthYear?: number | null;
  note?: string | null;
};

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function isValidMonthDay(month: number, day: number) {
  const date = new Date(Date.UTC(2000, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isPokrovAdmin(
  user: { id: number; email: string },
  calendar: { ownerUserId: number | null }
) {
  return calendar.ownerUserId === user.id || POKROV_ADMIN_EMAILS.has(user.email.trim().toLowerCase());
}

export function parseSharedReminderDays(value: string) {
  const parsed = value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => SHARED_REMINDER_DAYS.includes(item as (typeof SHARED_REMINDER_DAYS)[number]));

  return [...new Set(parsed)].sort((a, b) => a - b);
}

export function normalizeSharedBirthdayInput(input: SharedBirthdayInput) {
  if (!input.name.trim() || input.name.trim().length > 120) return null;
  if (!isValidMonthDay(input.birthMonth, input.birthDay)) return null;

  const birthYear = input.birthYear ?? null;
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 9999)) {
    return null;
  }

  const legacyYear = birthYear ?? new Date().getFullYear();

  return {
    name: input.name.trim(),
    date: `${legacyYear}-${pad2(input.birthMonth)}-${pad2(input.birthDay)}`,
    birthMonth: input.birthMonth,
    birthDay: input.birthDay,
    birthYear,
    note: input.note?.trim() ? input.note.trim() : null,
  };
}

export async function ensurePokrovCalendar(ownerUserId?: number) {
  const existing = await db.query.sharedCalendars.findFirst({
    where: eq(sharedCalendars.slug, POKROV_CALENDAR_SLUG),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(sharedCalendars)
    .values({
      slug: POKROV_CALENDAR_SLUG,
      name: POKROV_CALENDAR_NAME,
      ownerUserId,
    })
    .onConflictDoNothing({ target: sharedCalendars.slug })
    .returning();

  if (created) return created;

  const row = await db.query.sharedCalendars.findFirst({
    where: eq(sharedCalendars.slug, POKROV_CALENDAR_SLUG),
  });

  if (!row) throw new Error("pokrov_calendar_unavailable");
  return row;
}

export async function ensurePokrovMember(userId: number) {
  const calendar = await ensurePokrovCalendar(userId);
  const existing = await db.query.sharedCalendarMembers.findFirst({
    where: and(
      eq(sharedCalendarMembers.calendarId, calendar.id),
      eq(sharedCalendarMembers.userId, userId)
    ),
  });
  if (existing) return { calendar, member: existing };

  const account = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      timezone: true,
      notificationsEnabled: true,
      reminderDays: true,
      reminderHour: true,
    },
  });

  const [created] = await db
    .insert(sharedCalendarMembers)
    .values({
      calendarId: calendar.id,
      userId,
      timezone: account?.timezone ?? "Europe/Moscow",
      notificationsEnabled: account?.notificationsEnabled ?? true,
      reminderDays: account?.reminderDays ?? "0,1,7",
      reminderHour: account?.reminderHour ?? 6,
    })
    .onConflictDoNothing({
      target: [sharedCalendarMembers.calendarId, sharedCalendarMembers.userId],
    })
    .returning();

  if (created) return { calendar, member: created };

  const member = await db.query.sharedCalendarMembers.findFirst({
    where: and(
      eq(sharedCalendarMembers.calendarId, calendar.id),
      eq(sharedCalendarMembers.userId, userId)
    ),
  });

  if (!member) throw new Error("pokrov_member_unavailable");
  return { calendar, member };
}
