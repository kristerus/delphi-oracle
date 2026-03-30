import { NextRequest, NextResponse } from "next/server";

/* ─── Protected routes — unauthenticated users are redirected to /login ──── */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/simulation",
  "/settings",
];

/* ─── Security headers applied to every response ─────────────────────────── */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const response = NextResponse.next();

  // 1. Security headers on every response
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  // 2. CORS for API routes
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin") ?? "";
    const allowedOrigin =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (origin === allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
    }

    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  // 3. Auth guard for protected routes
  if (isProtected(pathname)) {
    // better-auth sets the session cookie under one of these names
    const sessionToken =
      req.cookies.get("better-auth.session_token")?.value ??
      req.cookies.get("__Secure-better-auth.session_token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  // Skip Next.js internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)"],
};
