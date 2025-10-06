export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, emailVerifications, loginTokens } from "@/db/schema";
import { eq, lt, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import { sendVerifyEmail, sendLoginEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    let { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "email обязателен" }, { status: 400 });
    }

    // ищем пользователя по email
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

    // 1) есть и верифицирован → отправляем магссылку на вход
    if (existing && existing.isVerified) {
      await db.delete(loginTokens).where(lt(loginTokens.expiresAt, new Date()));
      const token = randomUUID();
      await db.insert(loginTokens).values({
        userId: existing.id,
        token,
        expiresAt: addMinutes(new Date(), 15),
      });
      const loginUrl = `${process.env.APP_URL}/api/auth/magic-login?token=${token}`;
      await sendLoginEmail(email, loginUrl);
      return NextResponse.json({ sent: "login" }); // фронт покажет: проверьте почту
    }

    // 2) есть, но не верифицирован → высылаем подтверждение (которое сразу логинит)
    if (existing && !existing.isVerified) {
      await db.delete(emailVerifications).where(eq(emailVerifications.userId, existing.id));
      const token = randomUUID();
      await db.insert(emailVerifications).values({
        userId: existing.id,
        token,
        expiresAt: addMinutes(new Date(), 30),
      });
      const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`; // verify ставит сессию
      await sendVerifyEmail(email, verifyUrl);
      return NextResponse.json({ sent: "verify" });
    }

    // 3) нет пользователя → создаём и шлём подтверждение (сразу войдёт после клика)
    const [row] = await db.insert(users)
      .values({ email, birthday: null }) // isVerified=false по умолчанию
      .returning();

    const token = randomUUID();
    await db.insert(emailVerifications).values({
      userId: row.id,
      token,
      expiresAt: addMinutes(new Date(), 30),
    });
    const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
    await sendVerifyEmail(email, verifyUrl);
    return NextResponse.json({ sent: "verify" }, { status: 201 });
  } catch (e) {
    console.error("MAGIC_REQUEST_ERROR", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
