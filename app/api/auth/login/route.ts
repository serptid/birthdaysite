// app/api/auth/login/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const ip = getClientIp(req);
    const byEmail = checkRateLimit(`login:${ip}:${email}`, 5, 15 * 60 * 1000);
    const byIp = checkRateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000);

    if (!byEmail.ok || !byIp.ok) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: Math.max(byEmail.retryAfter, byIp.retryAfter) },
        { status: 429 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    }
    if (!user.isVerified) return NextResponse.json({ error: "email_not_verified" }, { status: 403 });

    await setSessionCookie({ id: user.id, email: user.email });
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error("LOGIN_ROUTE_ERROR", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
