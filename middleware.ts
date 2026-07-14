import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.hostname !== "www.bdsite.ru") {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.hostname = "bdsite.ru";
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: "/:path*",
};
