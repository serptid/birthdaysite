export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";

const passwordSchema = z.object({
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().min(8).max(128),
});

export async function PUT(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.id),
    columns: { id: true, passwordHash: true },
  });

  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (user.passwordHash) {
    const currentOk = await verifyPassword(parsed.data.currentPassword ?? "", user.passwordHash);
    if (!currentOk) {
      return NextResponse.json({ error: "invalid_current_password" }, { status: 403 });
    }
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  return NextResponse.json({ ok: true });
}
