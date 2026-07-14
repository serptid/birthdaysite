export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sharedCalendarBirthdays, users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { ensurePokrovMember, isPokrovAdmin, parseSharedReminderDays } from "@/lib/shared-calendar";
import { parseCalendarThemeText } from "@/lib/calendar-theme";

function databaseUnavailableResponse(error: unknown) {
  console.error("pokrov_api_database_error", error);
  return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { calendar, member } = await ensurePokrovMember(user.id);
    const isAdmin = isPokrovAdmin(user, calendar);
    const account = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        passwordHash: true,
        calendarTheme: true,
      },
    });
    const birthdays = await db
      .select({
        id: sharedCalendarBirthdays.id,
        calendarId: sharedCalendarBirthdays.calendarId,
        userId: sharedCalendarBirthdays.userId,
        name: sharedCalendarBirthdays.name,
        date: sharedCalendarBirthdays.date,
        birthMonth: sharedCalendarBirthdays.birthMonth,
        birthDay: sharedCalendarBirthdays.birthDay,
      })
      .from(sharedCalendarBirthdays)
      .where(eq(sharedCalendarBirthdays.calendarId, calendar.id));
    const calendarBirthdays = birthdays.map((birthday) => ({
      ...birthday,
      birthYear: null,
    }));
    const myBirthday = calendarBirthdays.find((birthday) => birthday.userId === user.id) ?? null;

    return NextResponse.json({
      calendar,
      member: {
        ...member,
        reminderDays: parseSharedReminderDays(member.reminderDays),
      },
      myBirthday,
      birthdays: calendarBirthdays,
      user: {
        ...user,
        hasPassword: Boolean(account?.passwordHash),
        calendarTheme: parseCalendarThemeText(account?.calendarTheme),
      },
      isAdmin,
    });
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}
