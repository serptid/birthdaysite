import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { clearSessionCookie, getSessionUser } from "@/lib/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ user: null });

  const user = await db.query.users.findFirst({
    where: and(eq(users.id, session.id), eq(users.email, session.email)),
    columns: { id: true, email: true, isVerified: true },
  });

  if (!user || !user.isVerified) {
    await clearSessionCookie();
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
