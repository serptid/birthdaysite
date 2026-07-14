export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { loginTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashToken } from "@/lib/tokens";
import { setSessionCookie } from "@/lib/session";
import { authRedirectUrl, normalizeAuthRedirect } from "@/lib/auth-redirect";

function authRedirect(url: string, key: string, value: string, redirectTo: string) {
  return authRedirectUrl(url, key, value, redirectTo);
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const redirectTo = normalizeAuthRedirect(req.nextUrl.searchParams.get("next"));
    if (!token || token.length > 256) {
      return NextResponse.redirect(authRedirect(req.url, "login", "missing", redirectTo));
    }

    // ищем токен
    const rec = await db.query.loginTokens.findFirst({
      where: eq(loginTokens.token, hashToken(token)),
    });

    // токен не найден или просрочен
    if (!rec || rec.expiresAt < new Date()) {
      // попытка зачистить, если найден
      if (rec) await db.delete(loginTokens).where(eq(loginTokens.id, rec.id));
      return NextResponse.redirect(authRedirect(req.url, "login", "expired", redirectTo));
    }

    // ищем пользователя
    const user = await db.query.users.findFirst({ where: eq(users.id, rec.userId) });
    if (!user) {
      await db.delete(loginTokens).where(eq(loginTokens.id, rec.id));
      return NextResponse.redirect(authRedirect(req.url, "login", "notfound", redirectTo));
    }

    await setSessionCookie({ id: user.id, email: user.email });
    await db.delete(loginTokens).where(eq(loginTokens.id, rec.id));

    return NextResponse.redirect(authRedirect(req.url, "login", "ok", redirectTo));
  } catch (error) {
    console.error("MAGIC_LOGIN_ERROR", error);
    const redirectTo = normalizeAuthRedirect(req.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(authRedirect(req.url, "login", "error", redirectTo));
  }
}
