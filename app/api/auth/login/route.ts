import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  let { nickname, email } = await req.json();

  if (!nickname || !email) {
    return NextResponse.json({ error: "nickname и email обязательны" }, { status: 400 });
  }

  // тот же формат ника, что и при регистрации
  nickname = nickname.trim().toUpperCase();

  const user = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.nickname, nickname)),
  });

  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  if (!user.isVerified) {
    return NextResponse.json({ error: "email_not_verified" }, { status: 403 });
  }

  (await cookies()).set(
    "session",
    JSON.stringify({ id: user.id, nickname: user.nickname, email: user.email }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 }
  );

  return NextResponse.json({ id: user.id, nickname: user.nickname, email: user.email });
}
