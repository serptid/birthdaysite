export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseCalendarThemeText } from "@/lib/calendar-theme";

const allowedReminderDays = [0, 1, 3, 7] as const;

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("ru-RU", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function parseReminderDays(value: string) {
  const parsed = value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => allowedReminderDays.includes(item as (typeof allowedReminderDays)[number]));

  return [...new Set(parsed)].sort((a, b) => a - b);
}

const settingsSchema = z.object({
  timezone: z.string().trim().min(1).max(80).refine(isValidTimeZone),
  notificationsEnabled: z.boolean(),
  reminderDays: z
    .array(z.coerce.number().int())
    .transform((days) =>
      [...new Set(days.filter((day) => allowedReminderDays.includes(day as (typeof allowedReminderDays)[number])))]
        .sort((a, b) => a - b)
    )
    .refine((days) => days.length > 0),
  reminderHour: z.coerce.number().int().min(0).max(23),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
    columns: {
      id: true,
      email: true,
      passwordHash: true,
      timezone: true,
      notificationsEnabled: true,
      reminderDays: true,
      reminderHour: true,
      calendarTheme: true,
    },
  });

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      hasPassword: Boolean(user.passwordHash),
      timezone: user.timezone,
      notificationsEnabled: user.notificationsEnabled,
      reminderDays: parseReminderDays(user.reminderDays),
      reminderHour: user.reminderHour,
      calendarTheme: parseCalendarThemeText(user.calendarTheme),
    },
  });
}

export async function PUT(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { timezone, notificationsEnabled, reminderDays, reminderHour } = parsed.data;
  const [row] = await db
    .update(users)
    .set({
      timezone,
      notificationsEnabled,
      reminderDays: reminderDays.join(","),
      reminderHour,
    })
    .where(eq(users.id, session.id))
    .returning({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      timezone: users.timezone,
      notificationsEnabled: users.notificationsEnabled,
      reminderDays: users.reminderDays,
      reminderHour: users.reminderHour,
      calendarTheme: users.calendarTheme,
    });

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: row.id,
      email: row.email,
      hasPassword: Boolean(row.passwordHash),
      timezone: row.timezone,
      notificationsEnabled: row.notificationsEnabled,
      reminderDays: parseReminderDays(row.reminderDays),
      reminderHour: row.reminderHour,
      calendarTheme: parseCalendarThemeText(row.calendarTheme),
    },
  });
}
