// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { users, emailVerifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import { sendVerifyEmail } from "@/lib/mail"; // см. ранее

export async function POST(req: Request) {
  const { nickname, email, birthday } = await req.json();
  if (!nickname || !email) return NextResponse.json({ error: "nickname и email обязательны" }, { status: 400 });

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  // email уже есть в БД
  if (existing) {
    if (existing.nickname !== nickname) {
      return NextResponse.json({ error: "email уже занят другим ником" }, { status: 409 });
    }
    // тот же ник: либо залогинить если уже верифицирован, либо выслать подтверждение
    if (existing.isVerified) {
      (await cookies()).set("session", JSON.stringify({ id: existing.id, nickname: existing.nickname, email: existing.email }), {
        httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
      });
      return NextResponse.json({ id: existing.id, nickname: existing.nickname, email: existing.email });
    } else {
      const token = randomUUID();
      // по желанию: очистить старые токены этого юзера
      await db.delete(emailVerifications).where(eq(emailVerifications.userId, existing.id));
      await db.insert(emailVerifications).values({
        userId: existing.id,
        token,
        expiresAt: addMinutes(new Date(), 30),
      });
      const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
      try { await sendVerifyEmail(email, verifyUrl); } catch {}
      return NextResponse.json({ need_verify: true });
    }
  }

  // email ещё не занят → создаём и шлём подтверждение
  const [row] = await db.insert(users)
    .values({ nickname, email, birthday: birthday ?? null }) // is_verified = false по умолчанию
    .returning();

  const token = randomUUID();
  await db.insert(emailVerifications).values({
    userId: row.id,
    token,
    expiresAt: addMinutes(new Date(), 30),
  });

  const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
  try { await sendVerifyEmail(email, verifyUrl); } catch {}

  // опционально ставь куку, но вход всё равно будет запрещён до верификации
  (await cookies()).set("session", JSON.stringify({ id: row.id, nickname: row.nickname, email: row.email }), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ id: row.id, nickname: row.nickname, email: row.email, need_verify: true }, { status: 201 });
}
