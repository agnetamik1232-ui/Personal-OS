import { NextResponse, type NextRequest } from "next/server";
import { verifySession, verifyApiSecret, AUTH_COOKIE } from "@/lib/auth";

// Routes that never require authentication
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",       // login / logout endpoints
  "/api/webhooks",   // Telegram and other inbound webhooks
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // ── Programmatic access via x-api-secret header ───────────────────────────
  const apiSecret = request.headers.get("x-api-secret");
  if (apiSecret) {
    if (verifyApiSecret(apiSecret)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Cookie-based session ──────────────────────────────────────────────────
  const token   = request.cookies.get(AUTH_COOKIE)?.value ?? "";
  const secret  = process.env["AUTH_SECRET"] ?? "";
  const isValid = token ? await verifySession(token, secret) : false;

  if (isValid) {
    return NextResponse.next();
  }

  // API routes get a JSON 401 rather than a redirect
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect to login, preserving the intended destination
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
