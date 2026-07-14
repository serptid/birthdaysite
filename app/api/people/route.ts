// app/api/people/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { peopleTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/session";

function isValidISODate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidISODate);

function isValidMonthDay(month: number, day: number) {
  const date = new Date(Date.UTC(2000, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const personShape = {
  name: z.string().trim().min(1).max(120),
  date: isoDateSchema.optional(),
  birthMonth: z.coerce.number().int().min(1).max(12).optional(),
  birthDay: z.coerce.number().int().min(1).max(31).optional(),
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
};

function validateBirthdayDate(value: z.infer<z.ZodObject<typeof personShape>>, ctx: z.RefinementCtx) {
  const hasStructuredDate = value.birthMonth !== undefined && value.birthDay !== undefined;
  if (!hasStructuredDate && !value.date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "birthday_date_required" });
    return;
  }

  if (hasStructuredDate && !isValidMonthDay(value.birthMonth!, value.birthDay!)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_month_day" });
  }
}

const createPersonSchema = z.object(personShape).superRefine(validateBirthdayDate);

const idSchema = z.coerce.number().int().positive();
const updatePersonSchema = z.object({
  ...personShape,
  id: idSchema,
}).superRefine(validateBirthdayDate);

type PersonInput = z.infer<typeof createPersonSchema>;
type PersonRow = typeof peopleTable.$inferSelect;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function normalizePersonInput(input: PersonInput) {
  const fromDate = input.date ? parseDateParts(input.date) : null;
  const birthMonth = input.birthMonth ?? fromDate?.month;
  const birthDay = input.birthDay ?? fromDate?.day;

  if (!birthMonth || !birthDay || !isValidMonthDay(birthMonth, birthDay)) {
    return null;
  }

  const birthYear =
    input.birthMonth !== undefined && input.birthDay !== undefined
      ? input.birthYear ?? null
      : fromDate?.year ?? input.birthYear ?? null;

  const legacyYear = birthYear ?? new Date().getFullYear();
  const date = `${legacyYear}-${pad2(birthMonth)}-${pad2(birthDay)}`;

  return {
    name: input.name,
    date,
    birthMonth,
    birthDay,
    birthYear,
    note: input.note,
  };
}

function rowMonthDay(row: PersonRow) {
  if (row.birthMonth && row.birthDay) {
    return { month: row.birthMonth, day: row.birthDay };
  }

  if (!row.date) return null;
  const { month, day } = parseDateParts(row.date);
  return { month, day };
}

function sameMonthDay(row: PersonRow, targetDate: string) {
  const target = parseDateParts(targetDate);
  const birthday = rowMonthDay(row);
  return Boolean(birthday && birthday.month === target.month && birthday.day === target.day);
}

function sameMonth(row: PersonRow, month: number) {
  const birthday = rowMonthDay(row);
  return Boolean(birthday && birthday.month === month);
}

function databaseUnavailableResponse(error: unknown) {
  console.error("people_api_database_error", error);
  return NextResponse.json({ error: "database_unavailable" }, { status: 503 });
}

function selectPeopleForUser(userId: number) {
  return db
    .select()
    .from(peopleTable)
    .where(eq(peopleTable.userId, userId));
}

// POST /api/people
// body: { name: string; date: "YYYY-MM-DD"; note?: string }
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createPersonSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const normalized = normalizePersonInput(parsed.data);
  if (!normalized) {
    return NextResponse.json({ error: "invalid_birthday_date" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(peopleTable)
      .values({ userId: user.id, ...normalized })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}

// GET /api/people
// ?date=YYYY-MM-DD         → записи на конкретный день
// ?year=YYYY&month=MM      → записи за месяц
// без параметров           → все записи пользователя
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");

  if (date) {
    const parsedDate = isoDateSchema.safeParse(date);
    if (!parsedDate.success) {
      return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    }

    try {
      const rows = await selectPeopleForUser(user.id);
      return NextResponse.json(rows.filter((row) => sameMonthDay(row, parsedDate.data)));
    } catch (error) {
      return databaseUnavailableResponse(error);
    }
  }

  if (year && month) {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isInteger(y) || y < 1900 || y > 9999 || !Number.isInteger(m) || m < 1 || m > 12) {
      return NextResponse.json({ error: "invalid_year_or_month" }, { status: 400 });
    }

    try {
      const rows = await selectPeopleForUser(user.id);
      return NextResponse.json(rows.filter((row) => sameMonth(row, m)));
    } catch (error) {
      return databaseUnavailableResponse(error);
    }
  }

  // если параметры не указаны — вернуть все записи пользователя
  try {
    const all = await selectPeopleForUser(user.id);
    return NextResponse.json(all);
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = updatePersonSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { id } = parsed.data;
  const normalized = normalizePersonInput(parsed.data);
  if (!normalized) {
    return NextResponse.json({ error: "invalid_birthday_date" }, { status: 400 });
  }

  try {
    const res = await db
      .update(peopleTable)
      .set(normalized)
      .where(and(eq(peopleTable.id, id), eq(peopleTable.userId, user.id)))
      .returning();

    if (res.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(res[0]);
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
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // удаляем только свою запись
  try {
    const res = await db
      .delete(peopleTable)
      .where(and(eq(peopleTable.id, parsedId.data), eq(peopleTable.userId, user.id)))
      .returning();

    if (res.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return databaseUnavailableResponse(error);
  }
}
