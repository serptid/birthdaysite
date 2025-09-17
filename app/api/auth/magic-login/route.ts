export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { loginTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";

function home(url: string, q: string) {
  const u = new URL("/", url);
  u.search = q;
  return u;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(home(req.url, "?login=missing"));

  // ищем токен
  const rec = await db.query.loginTokens.findFirst({
    where: eq(loginTokens.token, token),
  });

  // токен не найден или просрочен
  if (!rec || rec.expiresAt < new Date()) {
    // попытка зачистить, если найден
    if (rec) await db.delete(loginTokens).where(eq(loginTokens.id, rec.id));
    return NextResponse.redirect(home(req.url, "?login=expired"));
  }

  // ищем пользователя
  const user = await db.query.users.findFirst({ where: eq(users.id, rec.userId) });
  if (!user) {
    await db.delete(loginTokens).where(eq(loginTokens.id, rec.id));
    return NextResponse.redirect(home(req.url, "?login=notfound"));
  }

  // одноразовость
  await db.delete(loginTokens).where(eq(loginTokens.id, rec.id));

  // ставим сессию
  (await cookies()).set(
    "session",
    JSON.stringify({ id: user.id, nickname: user.nickname, email: user.email }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: true, // прод
    }
  );

  return NextResponse.redirect(home(req.url, "?login=ok"));
}
