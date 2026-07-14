export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/mail";
import { createToken } from "@/lib/tokens";
import { authTokenUrl } from "@/lib/auth-redirect";

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

function genericSent() {
  return NextResponse.json({ sent: "ok" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const email = parsed.data.email;
    const ip = getClientIp(req);
    const byEmail = checkRateLimit(`password-reset:${ip}:${email}`, 5, 15 * 60 * 1000);
    const byIp = checkRateLimit(`password-reset-ip:${ip}`, 30, 15 * 60 * 1000);

    if (!byEmail.ok || !byIp.ok) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: Math.max(byEmail.retryAfter, byIp.retryAfter) },
        { status: 429 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true, isVerified: true },
    });

    if (!user || !user.isVerified) {
      return genericSent();
    }

    await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    const { token, tokenHash } = createToken();
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: tokenHash,
      expiresAt: addMinutes(new Date(), 30),
    });

    const resetUrl = authTokenUrl(req, "/reset-password", token);
    await sendPasswordResetEmail(user.email, resetUrl);

    return genericSent();
  } catch (error) {
    console.error("PASSWORD_RESET_REQUEST_ERROR", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
