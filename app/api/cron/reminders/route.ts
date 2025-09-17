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
  const hdr = process.env.CRON_SECRET;
  return hdr && req.headers.get("authorization") === `Bearer ${hdr}`;
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const usrs = await db.query.users.findMany({
    where: eq(users.isVerified, true),
    columns: { id: true, email: true, nickname: true, timezone: true },
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

    const byMMDD = (iso: string) => {
      const { m, d } = parseISO(iso);
      return `${pad2(m)}-${pad2(d)}`;
    };

    const D0 = people.filter(p => p.date && byMMDD(p.date) === todayMMDD);
    const D1 = people.filter(p => p.date && byMMDD(p.date) === tomorrowMMDD);
    const D7 = people.filter(p => p.date && byMMDD(p.date) === weekMMDD);

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

    await sendReminderEmail(u.email, u.nickname, {
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
