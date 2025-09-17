// app/api/auth/magic-login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { loginTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const record = await db.query.loginTokens.findFirst({ where: eq(loginTokens.token, token) });
  if (!record || record.expiresAt < new Date())
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });

  const user = await db.query.users.findFirst({ where: eq(users.id, record.userId) });
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  // одноразовость
  await db.delete(loginTokens).where(eq(loginTokens.id, record.id));

  (await cookies()).set(
    "session",
    JSON.stringify({ id: user.id, nickname: user.nickname, email: user.email }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 }
  );

  return NextResponse.redirect("/?login=ok");
}
