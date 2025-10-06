// app/api/cron/reminders/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, peopleTable, notificationLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { todayInTZ, addDaysUTC, mmdd, parseISO, pad2 } from "@/lib/when";
import { sendReminderEmail } from "@/lib/reminderEmail";

function authOk(req: Request) {
  // 1) ручные вызовы с токеном
  const okBearer =
    process.env.CRON_SECRET &&
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  // 2) вызовы от Vercel Cron (официальный заголовок)
  const okVercel = req.headers.get("x-vercel-cron") === "1";
  return okBearer || okVercel;
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const usrs = await db.query.users.findMany({
    where: eq(users.isVerified, true),
    columns: { id: true, email: true, timezone: true },
  });

  let processed = 0, mailed = 0;

  for (const u of usrs) {
    processed++;

    const tz = u.timezone || "Europe/Moscow";
    const t = todayInTZ(tz);
    const z = addDaysUTC(t.y, t.m, t.d, 1);
    const s = addDaysUTC(t.y, t.m, t.d, 7);

    const todayMMDD  = mmdd(t.y, t.m, t.d);
    const tomorrowMMDD = mmdd(z.y, z.m, z.d);
    const weekMMDD     = mmdd(s.y, s.m, s.d);

    // достаём всех людей пользователя (можно оптимизировать SQL на сервере, но так проще и ясно)
    const people = await db.query.peopleTable.findMany({
      where: eq(peopleTable.userId, u.id),
      columns: { id: true, name: true, date: true, note: true },
    });

    function byMMDDAnnual(iso: string, targetY: number) {
      let { m, d } = parseISO(iso);
      // если дата 29.02, а год targetY невисокосный — считаем 28.02
      const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
      if (m === 2 && d === 29 && !leap(targetY)) d = 28;
      return `${pad2(m)}-${pad2(d)}`;
    }

    const D0 = people.filter(p => p.date && byMMDDAnnual(p.date, t.y) === todayMMDD);
    const D1 = people.filter(p => p.date && byMMDDAnnual(p.date, z.y) === tomorrowMMDD);
    const D7 = people.filter(p => p.date && byMMDDAnnual(p.date, s.y) === weekMMDD);

    if (D0.length + D1.length + D7.length === 0) continue;

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
    const toMail = (arr: { name: string | null; date: string | null; note: string | null }[]) => arr
    .filter(p => p.name && p.date) // выкинем пустые
    .map(p => ({ name: p.name as string, date: p.date as string, note: p.note ?? null }))

    await sendReminderEmail(u.email, {
      D0: toMail(D0),
      D1: toMail(D1),
      D7: toMail(D7),
    })
    mailed++;

    // лог на каждую запись, чтобы можно было детальнее анализировать
    const rows = [
      ...D0.map(p => ({ userId: u.id, personId: p.id, kind: "D0", runDate: runDateISO })),
      ...D1.map(p => ({ userId: u.id, personId: p.id, kind: "D1", runDate: runDateISO })),
      ...D7.map(p => ({ userId: u.id, personId: p.id, kind: "D7", runDate: runDateISO })),
    ];
    if (rows.length) {
      await db.insert(notificationLogs).values(rows).onConflictDoNothing();
    }
  }

  return NextResponse.json({ ok: true, users: processed, mailed });
}
