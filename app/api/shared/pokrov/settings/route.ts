export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { sharedCalendarMembers } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import {
  SHARED_REMINDER_DAYS,
  ensurePokrovMember,
  isValidTimeZone,
  parseSharedReminderDays,
} from "@/lib/shared-calendar";

const settingsSchema = z.object({
  timezone: z.string().trim().min(1).max(80).refine(isValidTimeZone),
  reminderHour: z.coerce.number().int().min(0).max(23),
  notificationsEnabled: z.boolean(),
  reminderDays: z
    .array(z.coerce.number().int())
    .transform((days) =>
      [...new Set(days.filter((day) => SHARED_REMINDER_DAYS.includes(day as (typeof SHARED_REMINDER_DAYS)[number])))]
        .sort((a, b) => a - b)
    ),
});

function databaseUnavailableResponse(error: unknown) {
  console.error("pokrov_settings_api_database_error", error);
  return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const { calendar } = await ensurePokrovMember(user.id);
    const { timezone, reminderHour, notificationsEnabled, reminderDays } = parsed.data;
    const [member] = await db
      .update(sharedCalendarMembers)
      .set({
        timezone,
        reminderHour,
        notificationsEnabled,
        reminderDays: reminderDays.join(","),
      })
      .where(
        and(
          eq(sharedCalendarMembers.calendarId, calendar.id),
          eq(sharedCalendarMembers.userId, user.id)
        )
      )
      .returning();

    if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({
      member: {
        ...member,
        reminderDays: parseSharedReminderDays(member.reminderDays),
      },
    });
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}
