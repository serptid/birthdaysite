export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { hashToken } from "@/lib/tokens";
import { setSessionCookie } from "@/lib/session";

const confirmSchema = z.object({
  token: z.string().min(20).max(256),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const { token, password } = parsed.data;
    const rec = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, hashToken(token)),
    });

    if (!rec || rec.expiresAt < new Date()) {
      if (rec) await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, rec.id));
      return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, rec.userId),
      columns: { id: true, email: true },
    });

    if (!user) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, rec.id));
      return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash, isVerified: true }).where(eq(users.id, user.id));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, rec.id));
    await setSessionCookie({ id: user.id, email: user.email });

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("PASSWORD_RESET_CONFIRM_ERROR", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
