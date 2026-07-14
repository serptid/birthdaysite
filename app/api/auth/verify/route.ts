// app/api/auth/verify/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { emailVerifications, users } from "@/db/schema";
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
      return NextResponse.redirect(authRedirect(req.url, "verify", "missing", redirectTo));
    }

    const rec = await db.query.emailVerifications.findFirst({
      where: eq(emailVerifications.token, hashToken(token)),
    });

    if (!rec || rec.expiresAt < new Date()) {
      if (rec) await db.delete(emailVerifications).where(eq(emailVerifications.id, rec.id));
      return NextResponse.redirect(authRedirect(req.url, "verify", "expired", redirectTo));
    }

    // подтвердить пользователя
    const user = await db.query.users.findFirst({ where: eq(users.id, rec.userId) });
    if (!user) {
      await db.delete(emailVerifications).where(eq(emailVerifications.id, rec.id));
      return NextResponse.redirect(authRedirect(req.url, "verify", "notfound", redirectTo));
    }

    await db.update(users).set({ isVerified: true }).where(eq(users.id, rec.userId));

    await setSessionCookie({ id: user.id, email: user.email });
    await db.delete(emailVerifications).where(eq(emailVerifications.id, rec.id));

    return NextResponse.redirect(authRedirect(req.url, "verify", "ok", redirectTo));
  } catch (error) {
    console.error("VERIFY_ROUTE_ERROR", error);
    const redirectTo = normalizeAuthRedirect(req.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(authRedirect(req.url, "verify", "error", redirectTo));
  }
}
