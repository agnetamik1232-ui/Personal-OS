import { NextResponse, type NextRequest } from "next/server";
import { signSession, sessionCookieOptions, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const secret   = process.env["AUTH_SECRET"]        ?? "";
  const password = process.env["DASHBOARD_PASSWORD"] ?? "";

  if (!secret || !password) {
    console.error("[auth] AUTH_SECRET or DASHBOARD_PASSWORD not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const submitted =
    body !== null &&
    typeof body === "object" &&
    "password" in body &&
    typeof (body as Record<string, unknown>)["password"] === "string"
      ? ((body as Record<string, string>)["password"] ?? "")
      : "";

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(password.padEnd(128));
  const actual   = Buffer.from(submitted.padEnd(128));
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= (expected[i] ?? 0) ^ (actual[i] ?? 0);
  }
  const isCorrect = diff === 0 && submitted.length === password.length;

  if (!isCorrect) {
    // Artificial delay to further slow brute-force attempts
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await signSession(secret);

  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";
  // Guard against open-redirect: only allow relative paths
  const redirectTo = next.startsWith("/") ? next : "/dashboard";

  const response = NextResponse.json({ ok: true, redirectTo });
  response.cookies.set(AUTH_COOKIE, token, sessionCookieOptions());
  return response;
}
