/**
 * HMAC-SHA256 signed session cookie utilities.
 * All crypto uses the Web Crypto API — works in both Edge and Node runtimes.
 *
 * Cookie format:  <base64url(payload)>.<base64url(signature)>
 * Payload:        JSON { iat: unix-seconds }
 */

const COOKIE_NAME = "pos_session";
const MAX_AGE_S   = 60 * 60 * 24 * 30; // 30 days

// ─── Key derivation ───────────────────────────────────────────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ─── Encoding helpers ─────────────────────────────────────────────────────────

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  return Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array<ArrayBuffer> {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const bytes  = Buffer.from(padded, "base64");
  const arr    = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes[i] ?? 0;
  return arr;
}

// ─── Sign / verify ────────────────────────────────────────────────────────────

export async function signSession(secret: string): Promise<string> {
  const payload = JSON.stringify({ iat: Math.floor(Date.now() / 1000) });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));

  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );

  return `${payloadB64}.${toBase64Url(sig)}`;
}

export async function verifySession(
  token: string,
  secret: string
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts as [string, string];

  try {
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return false;

    // Check expiry
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64))
    ) as { iat: number };
    const age = Math.floor(Date.now() / 1000) - payload.iat;
    return age < MAX_AGE_S;
  } catch {
    return false;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export const AUTH_COOKIE = COOKIE_NAME;

export function sessionCookieOptions(maxAge = MAX_AGE_S) {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// ─── Programmatic access (x-api-secret header) ───────────────────────────────

export function verifyApiSecret(headerValue: string | null): boolean {
  const secret = process.env["AUTH_SECRET"];
  if (!secret || !headerValue) return false;
  // Constant-time comparison to avoid timing attacks
  const a = Buffer.from(headerValue.padEnd(64));
  const b = Buffer.from(secret.padEnd(64));
  if (a.length !== b.length) return false;
  return crypto.subtle !== undefined
    ? timingSafeEqual(a, b)
    : false;
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
