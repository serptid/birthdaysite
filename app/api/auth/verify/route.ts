import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { emailVerifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const record = await db.query.emailVerifications.findFirst({
    where: eq(emailVerifications.token, token),
  });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
  }

  await db
    .update(users)
    .set({ isVerified: true })
    .where(eq(users.id, record.userId));

  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.id, record.id));

  return NextResponse.redirect("/?verified=1"); // или страница успеха
}
