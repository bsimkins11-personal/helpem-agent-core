import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  // Allow API routes (needed by iOS app)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow root landing page and static assets
  if (pathname === "/" || pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Check if request is from iOS app WebView or authenticated session
  const isFromiOSApp = userAgent.includes("helpem") || userAgent.includes("Mobile/");
  const hasSessionToken = request.cookies.has("session_token");

  // Protect app routes - TEMPORARILY DISABLED FOR UAT
  // TODO: Re-enable after UAT testing
  /*
  if (
    pathname.startsWith("/app") ||
    pathname.startsWith("/todos") ||
    pathname.startsWith("/habits") ||
    pathname.startsWith("/appointments")
  ) {
    if (!isFromiOSApp && !hasSessionToken) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  */

  return NextResponse.next();
}
