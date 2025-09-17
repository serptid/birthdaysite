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

// GET /api/people?date=YYYY-MM-DD
// GET /api/people?year=YYYY&month=MM
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

  return NextResponse.json({ error: "укажи date или year+month" }, { status: 400 });
}
