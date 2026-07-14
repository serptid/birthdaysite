export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { sharedCalendarBirthdays, sharedCalendarMembers, users } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/session";
import {
  ensurePokrovMember,
  isPokrovAdmin,
  normalizeSharedBirthdayInput,
} from "@/lib/shared-calendar";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
});

const idSchema = z.coerce.number().int().positive();

const birthdaySchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(120),
  birthMonth: z.coerce.number().int().min(1).max(12),
  birthDay: z.coerce.number().int().min(1).max(31),
  birthYear: z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return null;
      return Number(value);
    },
    z.number().int().min(1900).max(9999).nullable()
  ).optional(),
  note: z.preprocess(
    (value) => {
      if (value === null || value === undefined) return null;
      const text = String(value).trim();
      return text.length > 0 ? text : null;
    },
    z.string().max(500).nullable()
  ),
});

function databaseUnavailableResponse(error: unknown) {
  console.error("pokrov_birthday_api_database_error", error);
  return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
}

function parseDateParts(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return { month, day };
}

function birthdayWithEditorEmail() {
  return db
    .select({
      birthday: sharedCalendarBirthdays,
      editedByEmail: users.email,
    })
    .from(sharedCalendarBirthdays)
    .leftJoin(users, eq(sharedCalendarBirthdays.editedByUserId, users.id));
}

async function enableCurrentUserReminders(calendarId: number, userId: number) {
  await db
    .update(sharedCalendarMembers)
    .set({ notificationsEnabled: true })
    .where(
      and(
        eq(sharedCalendarMembers.calendarId, calendarId),
        eq(sharedCalendarMembers.userId, userId)
      )
    );
}

async function getRequestContext(user: SessionUser) {
  const { calendar, member } = await ensurePokrovMember(user.id);
  return {
    calendar,
    member,
    isAdmin: isPokrovAdmin(user, calendar),
  };
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsedDate = dateSchema.safeParse(url.searchParams.get("date"));
  if (!parsedDate.success) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const { calendar, isAdmin } = await getRequestContext(user);
    const { month, day } = parseDateParts(parsedDate.data);
    const rows = await birthdayWithEditorEmail().where(
      and(
        eq(sharedCalendarBirthdays.calendarId, calendar.id),
        eq(sharedCalendarBirthdays.birthMonth, month),
        eq(sharedCalendarBirthdays.birthDay, day)
      )
    );

    return NextResponse.json(
      rows.map(({ birthday, editedByEmail }) => ({
        ...birthday,
        ...(isAdmin ? { editedByEmail } : {}),
      }))
    );
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = birthdaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const normalized = normalizeSharedBirthdayInput({
    ...parsed.data,
    birthYear: parsed.data.birthYear ?? null,
  });
  if (!normalized) {
    return NextResponse.json({ error: "invalid_birthday_date" }, { status: 400 });
  }

  try {
    const { calendar, member, isAdmin } = await getRequestContext(user);

    if (isAdmin) {
      const [birthday] = await db
        .insert(sharedCalendarBirthdays)
        .values({
          calendarId: calendar.id,
          userId: null,
          editedByUserId: user.id,
          ...normalized,
        })
        .returning();

      return NextResponse.json({ birthday, member }, { status: 201 });
    }

    await enableCurrentUserReminders(calendar.id, user.id);

    const [birthday] = await db
      .insert(sharedCalendarBirthdays)
      .values({
        calendarId: calendar.id,
        userId: user.id,
        editedByUserId: user.id,
        ...normalized,
      })
      .onConflictDoUpdate({
        target: [sharedCalendarBirthdays.calendarId, sharedCalendarBirthdays.userId],
        set: {
          ...normalized,
          editedByUserId: user.id,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      birthday,
      member: { ...member, notificationsEnabled: true },
    });
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = birthdaySchema.safeParse(body);
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const normalized = normalizeSharedBirthdayInput({
    ...parsed.data,
    birthYear: parsed.data.birthYear ?? null,
  });
  if (!normalized) {
    return NextResponse.json({ error: "invalid_birthday_date" }, { status: 400 });
  }

  try {
    const { calendar, member, isAdmin } = await getRequestContext(user);
    const where = isAdmin
      ? and(
          eq(sharedCalendarBirthdays.id, parsed.data.id),
          eq(sharedCalendarBirthdays.calendarId, calendar.id)
        )
      : and(
          eq(sharedCalendarBirthdays.id, parsed.data.id),
          eq(sharedCalendarBirthdays.calendarId, calendar.id),
          eq(sharedCalendarBirthdays.userId, user.id)
        );

    const [birthday] = await db
      .update(sharedCalendarBirthdays)
      .set({
        ...normalized,
        editedByUserId: user.id,
        updatedAt: new Date(),
      })
      .where(where)
      .returning();

    if (!birthday) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (birthday.userId === user.id) {
      await enableCurrentUserReminders(calendar.id, user.id);
    }

    return NextResponse.json({
      birthday,
      member: birthday.userId === user.id ? { ...member, notificationsEnabled: true } : member,
    });
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsedId = idSchema.safeParse(url.searchParams.get("id"));
  if (!parsedId.success) {
    return NextResponse.json({ error: "id_required" }, { status: 400 });
  }

  try {
    const { calendar, isAdmin } = await getRequestContext(user);
    const where = isAdmin
      ? and(
          eq(sharedCalendarBirthdays.id, parsedId.data),
          eq(sharedCalendarBirthdays.calendarId, calendar.id)
        )
      : and(
          eq(sharedCalendarBirthdays.id, parsedId.data),
          eq(sharedCalendarBirthdays.calendarId, calendar.id),
          eq(sharedCalendarBirthdays.userId, user.id)
        );

    const deleted = await db
      .delete(sharedCalendarBirthdays)
      .where(where)
      .returning({ id: sharedCalendarBirthdays.id });

    if (deleted.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}
