export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users, emailVerifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { addMinutes } from "date-fns";
import { sendVerifyEmail } from "@/lib/mail"; // см. ранее
import { createToken } from "@/lib/tokens";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/password";
import { z } from "zod";
import { normalizeAuthRedirect } from "@/lib/auth-redirect";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  redirectTo: z.string().max(200).optional(),
});

function tokenUrl(path: string, token: string, redirectTo: string, fallbackUrl: string) {
  const url = new URL(path, process.env.APP_URL || fallbackUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("next", redirectTo);
  return url.toString();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { email, password, birthday } = parsed.data;
  const redirectTo = normalizeAuthRedirect(parsed.data.redirectTo);
  const ip = getClientIp(req);
  const byEmail = checkRateLimit(`register:${ip}:${email}`, 5, 15 * 60 * 1000);
  const byIp = checkRateLimit(`register-ip:${ip}`, 30, 15 * 60 * 1000);

  if (!byEmail.ok || !byIp.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: Math.max(byEmail.retryAfter, byIp.retryAfter) },
      { status: 429 }
    );
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  // email уже в базе
  if (existing) {
    if (existing.isVerified) {
      // зарегистрирован и подтверждён
      return NextResponse.json({ error: "already_registered" }, { status: 409 });
    }

    // не подтверждён: пересоздаём токен и шлём письмо
    const passwordHash = await hashPassword(password);
    const { token, tokenHash } = createToken();
    await db.update(users).set({ passwordHash }).where(eq(users.id, existing.id));
    await db.delete(emailVerifications).where(eq(emailVerifications.userId, existing.id));
    await db.insert(emailVerifications).values({
      userId: existing.id,
      token: tokenHash,
      expiresAt: addMinutes(new Date(), 30),
    });

    const verifyUrl = tokenUrl("/api/auth/verify", token, redirectTo, req.url);
    try { await sendVerifyEmail(email, verifyUrl); } catch {}

    // важно: куки НЕ ставим до подтверждения
    return NextResponse.json({ need_verify: true });
  }

  // нового создаём как не верифицированного
  const passwordHash = await hashPassword(password);
  const [row] = await db.insert(users)
    .values({ email, passwordHash, birthday: birthday ?? null })
    .returning();

  const { token, tokenHash } = createToken();
  await db.insert(emailVerifications).values({
    userId: row.id,
    token: tokenHash,
    expiresAt: addMinutes(new Date(), 30),
  });

  const verifyUrl = tokenUrl("/api/auth/verify", token, redirectTo, req.url);
  try { await sendVerifyEmail(email, verifyUrl); } catch {}

  // важно: куки НЕ ставим
  return NextResponse.json({ need_verify: true }, { status: 201 });
}
