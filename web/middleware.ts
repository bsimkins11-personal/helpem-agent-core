import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public pages and static assets
  if (
    pathname === "/" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images/") ||
    pathname === "/app" ||
    pathname === "/app/signin" ||
    pathname === "/app/onboarding" ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/referrals") ||
    pathname.startsWith("/join")
  ) {
    return NextResponse.next();
  }

  // Protect app routes - require session cookie
  if (pathname.startsWith("/app")) {
    const hasSessionToken = request.cookies.has("session_token");

    if (!hasSessionToken) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
  }

  return NextResponse.next();
}
