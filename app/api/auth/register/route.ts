import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { nickname, email, birthday } = await req.json();

  if (!nickname || !email) {
    return NextResponse.json({ error: "nickname и email обязательны" }, { status: 400 });
  }

  // email уникален; дополнительно не позволяем дубли по паре nickname+email
  const exists = await db.query.users.findFirst({
    where: and(eq(users.email, email), eq(users.nickname, nickname)),
  });

  if (exists) {
    // логиним, если такой уже есть
    (await cookies()).set("session", JSON.stringify({
      id: exists.id, nickname: exists.nickname, email: exists.email,
    }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ id: exists.id, nickname: exists.nickname, email: exists.email });
  }

  // создаём нового
  const [row] = await db.insert(users)
    .values({ nickname, email, birthday: birthday ?? null })
    .returning();

  (await cookies()).set("session", JSON.stringify({
    id: row.id, nickname: row.nickname, email: row.email,
  }), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });

  return NextResponse.json(
    { id: row.id, nickname: row.nickname, email: row.email, birthday: row.birthday },
    { status: 201 },
  );
}
