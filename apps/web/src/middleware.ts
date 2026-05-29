import { NextRequest, NextResponse } from "next/server";

// Edge runtime: inline the cookie constants, don't import @/lib/auth.
const ADMIN_COOKIE = "agentsgo_admin";
const ADMIN_COOKIE_VALUE = "1";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Bare /admin is the login form — open. Only guard /admin/<sub>...
  if (!pathname.startsWith("/admin/")) return NextResponse.next();

  if (req.cookies.get(ADMIN_COOKIE)?.value === ADMIN_COOKIE_VALUE) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin/:path*"] };
