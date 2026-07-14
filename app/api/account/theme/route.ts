export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import {
  parseCalendarThemeInput,
  parseCalendarThemeText,
  stringifyCalendarTheme,
} from "@/lib/calendar-theme";
import { getSessionUser } from "@/lib/session";

export async function PUT(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const calendarTheme = parseCalendarThemeInput(body?.calendarTheme);

  if (!calendarTheme) {
    return NextResponse.json({ error: "invalid_calendar_theme" }, { status: 400 });
  }

  const [row] = await db
    .update(users)
    .set({ calendarTheme: stringifyCalendarTheme(calendarTheme) })
    .where(eq(users.id, session.id))
    .returning({ calendarTheme: users.calendarTheme });

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    calendarTheme: parseCalendarThemeText(row.calendarTheme),
  });
}
