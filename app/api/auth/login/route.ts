// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { loginTokens } from "@/db/schema/loginTokens";
import { and, eq, lt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { addMinutes } from "date-fns";
import { sendLoginEmail } from "@/lib/mail";

export async function POST(req: Request) {
  let { nickname, email } = await req.json();
  if (!nickname || !email) return NextResponse.json({ error: "nickname и email обязательны" }, { status: 400 });
  nickname = nickname.trim().toUpperCase();

  const user = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.nickname, nickname)),
  });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  if (!user.isVerified) return NextResponse.json({ error: "email_not_verified" }, { status: 403 });

  // очистим старые просроченные
  await db.delete(loginTokens).where(lt(loginTokens.expiresAt, new Date()));

  // создаём одноразовую ссылку на вход
  const token = randomUUID();
  await db.insert(loginTokens).values({
    userId: user.id,
    token,
    expiresAt: addMinutes(new Date(), 15),
  });

  const loginUrl = `${process.env.APP_URL}/api/auth/magic-login?token=${token}`;
  try { await sendLoginEmail(email, loginUrl); } catch {}

  return NextResponse.json({ need_magic: true }); // фронт показывает сообщение «Проверьте почту»
}
