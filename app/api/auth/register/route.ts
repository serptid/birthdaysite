export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, emailVerifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import { sendVerifyEmail } from "@/lib/mail"; // см. ранее

export async function POST(req: Request) {
  let { email, birthday } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "email обязателен" }, { status: 400 });
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  // email уже в базе
  if (existing) {
    if (existing.isVerified) {
      // зарегистрирован и подтверждён
      return NextResponse.json({ ok: true, already_verified: true });
    }

    // не подтверждён: пересоздаём токен и шлём письмо
    const token = randomUUID();
    await db.delete(emailVerifications).where(eq(emailVerifications.userId, existing.id));
    await db.insert(emailVerifications).values({
      userId: existing.id,
      token,
      expiresAt: addMinutes(new Date(), 30),
    });

    const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
    try { await sendVerifyEmail(email, verifyUrl); } catch {}

    // важно: куки НЕ ставим до подтверждения
    return NextResponse.json({ need_verify: true });
  }

  // нового создаём как не верифицированного
  const [row] = await db.insert(users)
    .values({ email, birthday: birthday ?? null })
    .returning();

  const token = randomUUID();
  await db.insert(emailVerifications).values({
    userId: row.id,
    token,
    expiresAt: addMinutes(new Date(), 30),
  });

  const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
  try { await sendVerifyEmail(email, verifyUrl); } catch {}

  // важно: куки НЕ ставим
  return NextResponse.json({ need_verify: true }, { status: 201 });
}
