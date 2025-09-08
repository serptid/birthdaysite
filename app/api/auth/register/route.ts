import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { usersTable } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nickname, email, birthday } = body;

    if (!nickname || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        nickname,
        email,
        ...(birthday ? { birthday } : {}), // добавить только если есть
      })
      .returning();

    const res = NextResponse.json(user, { status: 201 });
    res.cookies.set("uid", String(user.id), {
      httpOnly: true,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
