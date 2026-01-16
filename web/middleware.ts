import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes (needed by iOS app)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow root landing page and static assets
  if (pathname === "/" || pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Redirect all app routes to landing page (app is iOS-only)
  if (
    pathname.startsWith("/app") ||
    pathname.startsWith("/todos") ||
    pathname.startsWith("/habits") ||
    pathname.startsWith("/appointments")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}
