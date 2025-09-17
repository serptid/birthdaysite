// app/api/auth/verify/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { emailVerifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";

function home(url: string, q: string) {
  const u = new URL("/", url);
  u.search = q;
  return u;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(home(req.url, "?verify=missing"));

  const rec = await db.query.emailVerifications.findFirst({
    where: eq(emailVerifications.token, token),
  });

  if (!rec || rec.expiresAt < new Date()) {
    if (rec) await db.delete(emailVerifications).where(eq(emailVerifications.id, rec.id));
    return NextResponse.redirect(home(req.url, "?verify=expired"));
  }

  // подтвердить пользователя
  const user = await db.query.users.findFirst({ where: eq(users.id, rec.userId) });
  if (!user) {
    await db.delete(emailVerifications).where(eq(emailVerifications.id, rec.id));
    return NextResponse.redirect(home(req.url, "?verify=notfound"));
  }

  await db.update(users).set({ isVerified: true }).where(eq(users.id, rec.userId));

  // одноразовость
  await db.delete(emailVerifications).where(eq(emailVerifications.id, rec.id));

  // ставим сессию сразу
  (await cookies()).set(
    "session",
    JSON.stringify({ id: user.id, nickname: user.nickname, email: user.email }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
      maxAge: 60 * 60 * 24 * 30,
    }
  );

  return NextResponse.redirect(home(req.url, "?verify=ok")); // редирект на главную с флагом
}
