import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const c = (await cookies()).get("session")?.value;
  if (!c) return NextResponse.json({ user: null });
  try {
    return NextResponse.json({ user: JSON.parse(c) });
  } catch {
    return NextResponse.json({ user: null });
  }
}
