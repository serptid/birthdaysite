// app/api/people/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { peopleTable } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";

// чтение userId из httpOnly cookie "session"
async function getUserIdFromSession(): Promise<number | null> {
  const raw = (await cookies()).get("session")?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

// POST /api/people
// body: { name: string; date: "YYYY-MM-DD"; note?: string }
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name, date, note } = await req.json();

  if (!name || !date) {
    return NextResponse.json({ error: "name и date обязательны" }, { status: 400 });
  }

  const [row] = await db
    .insert(peopleTable)
    .values({ userId, name, date, note: note ?? null })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

// GET /api/people
// ?date=YYYY-MM-DD         → записи на конкретный день
// ?year=YYYY&month=MM      → записи за месяц
// без параметров           → все записи пользователя
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");

  if (date) {
    const rows = await db
      .select()
      .from(peopleTable)
      .where(and(eq(peopleTable.userId, userId), eq(peopleTable.date, date)));
    return NextResponse.json(rows);
  }

  if (year && month) {
    const mm = month.padStart(2, "0");
    const from = `${year}-${mm}-01`;
    const to = `${year}-${mm}-31`; // достаточно для фильтра по месяцу
    const rows = await db
      .select()
      .from(peopleTable)
      .where(
        and(
          eq(peopleTable.userId, userId),
          gte(peopleTable.date, from),
          lte(peopleTable.date, to)
        )
      );
    return NextResponse.json(rows);
  }

  // если параметры не указаны — вернуть все записи пользователя
  const all = await db
    .select()
    .from(peopleTable)
    .where(eq(peopleTable.userId, userId));
  return NextResponse.json(all);
}
export async function DELETE(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const idParam = url.searchParams.get("id");
  const id = idParam ? Number(idParam) : NaN;
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // удаляем только свою запись
  const res = await db
    .delete(peopleTable)
    .where(and(eq(peopleTable.id, id), eq(peopleTable.userId, userId)))
    .returning();

  if (res.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
