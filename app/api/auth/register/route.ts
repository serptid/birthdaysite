import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { emailVerifications } from "@/db/schema/emailVerifications";
import { addMinutes } from "date-fns";

export async function POST(req: Request) {
  const { nickname, email, birthday } = await req.json();

  if (!nickname || !email) {
    return NextResponse.json({ error: "nickname и email обязательны" }, { status: 400 });
  }

  const exists = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.nickname, nickname)),
  });

  if (exists) {
    (await cookies()).set("session", JSON.stringify({
      id: exists.id, nickname: exists.nickname, email: exists.email,
    }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ id: exists.id, nickname: exists.nickname, email: exists.email });
  }

  // создаём нового пользователя
  const [row] = await db.insert(users)
    .values({ nickname, email, birthday: birthday ?? null })
    .returning();

  // генерируем токен верификации
  const token = randomUUID();
  await db.insert(emailVerifications).values({
    userId: row.id, // ✅ теперь используем реальный id из row
    token,
    expiresAt: addMinutes(new Date(), 30),
  });

  const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
  console.log("Verify your email:", verifyUrl);

  (await cookies()).set("session", JSON.stringify({
    id: row.id, nickname: row.nickname, email: row.email,
  }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });

  return NextResponse.json(
    { id: row.id, nickname: row.nickname, email: row.email, birthday: row.birthday },
    { status: 201 },
  );
}
