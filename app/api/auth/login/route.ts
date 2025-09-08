// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { usersTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nickname, email } = body;

    if (!nickname || !email) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // ищем пользователя по nickname и email
    const user = await db.query.usersTable.findFirst({
      where: and(
        eq(usersTable.nickname, nickname),
        eq(usersTable.email, email)
      ),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const responseData = {
      nickname: user.nickname,
      email: user.email,
    };
    // ответ с установкой cookie
    const res = NextResponse.json(responseData, { status: 200 });
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
