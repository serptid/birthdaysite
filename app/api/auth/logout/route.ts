import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  (await cookies()).set("session", "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
