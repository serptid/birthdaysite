export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, emailVerifications, loginTokens } from "@/db/schema";
import { eq, lt } from "drizzle-orm";
import { addMinutes } from "date-fns";
import { sendVerifyEmail, sendLoginEmail } from "@/lib/mail";
import { createToken } from "@/lib/tokens";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { normalizeAuthRedirect } from "@/lib/auth-redirect";

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  redirectTo: z.string().max(200).optional(),
});

function tokenUrl(path: string, token: string, redirectTo: string, fallbackUrl: string) {
  const url = new URL(path, process.env.APP_URL || fallbackUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("next", redirectTo);
  return url.toString();
}

function genericSent() {
  return NextResponse.json({ sent: "ok" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const email = parsed.data.email;
    const redirectTo = normalizeAuthRedirect(parsed.data.redirectTo);
    const ip = getClientIp(req);
    const byEmail = checkRateLimit(`magic:${ip}:${email}`, 5, 15 * 60 * 1000);
    const byIp = checkRateLimit(`magic-ip:${ip}`, 30, 15 * 60 * 1000);

    if (!byEmail.ok || !byIp.ok) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: Math.max(byEmail.retryAfter, byIp.retryAfter) },
        { status: 429 }
      );
    }

    // ищем пользователя по email
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

    // 1) есть и верифицирован → отправляем магссылку на вход
    if (existing && existing.isVerified) {
      await db.delete(loginTokens).where(lt(loginTokens.expiresAt, new Date()));
      const { token, tokenHash } = createToken();
      await db.insert(loginTokens).values({
        userId: existing.id,
        token: tokenHash,
        expiresAt: addMinutes(new Date(), 15),
      });
      const loginUrl = tokenUrl("/api/auth/magic-login", token, redirectTo, req.url);
      await sendLoginEmail(email, loginUrl);
      return genericSent();
    }

    // 2) есть, но не верифицирован → высылаем подтверждение (которое сразу логинит)
    if (existing && !existing.isVerified) {
      await db.delete(emailVerifications).where(eq(emailVerifications.userId, existing.id));
      const { token, tokenHash } = createToken();
      await db.insert(emailVerifications).values({
        userId: existing.id,
        token: tokenHash,
        expiresAt: addMinutes(new Date(), 30),
      });
      const verifyUrl = tokenUrl("/api/auth/verify", token, redirectTo, req.url); // verify ставит сессию
      await sendVerifyEmail(email, verifyUrl);
      return genericSent();
    }

    // 3) нет пользователя → создаём и шлём подтверждение (сразу войдёт после клика)
    const [row] = await db.insert(users)
      .values({ email, birthday: null }) // isVerified=false по умолчанию
      .returning();

    const { token, tokenHash } = createToken();
    await db.insert(emailVerifications).values({
      userId: row.id,
      token: tokenHash,
      expiresAt: addMinutes(new Date(), 30),
    });
    const verifyUrl = tokenUrl("/api/auth/verify", token, redirectTo, req.url);
    await sendVerifyEmail(email, verifyUrl);
    return genericSent();
  } catch (e) {
    console.error("MAGIC_REQUEST_ERROR", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
