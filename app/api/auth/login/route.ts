import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { nickname, email } = await req.json();

  if (!nickname || !email) {
    return NextResponse.json({ error: "nickname и email обязательны" }, { status: 400 });
  }

  const row = await db.query.users.findFirst({
    where: and(eq(users.nickname, nickname), eq(users.email, email)),
  });

  if (!row) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  (await cookies()).set("session", JSON.stringify({
    id: row.id, nickname: row.nickname, email: row.email,
  }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });

  return NextResponse.json({ id: row.id, nickname: row.nickname, email: row.email });
  


}
