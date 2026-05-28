/**
 * Minimal Google service-account OAuth2 — no heavy SDK needed.
 * Signs a JWT with the private key, exchanges it for an access token.
 */
import crypto from "crypto";

interface TokenCache {
  token:     string;
  expiresAt: number;
}
let _cache: TokenCache | null = null;

function base64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function getGoogleAccessToken(scope: string): Promise<string> {
  if (_cache && _cache.expiresAt > Date.now() + 30_000) return _cache.token;

  const email = process.env["GOOGLE_SERVICE_ACCOUNT_EMAIL"];
  const rawKey = process.env["GOOGLE_SERVICE_ACCOUNT_KEY"];
  if (!email || !rawKey) throw new Error("Google service account env vars missing");

  // Allow key to be stored with literal \n or real newlines
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const now   = Math.floor(Date.now() / 1000);
  const claim = {
    iss:   email,
    scope,
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  };

  const header  = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify(claim));
  const input   = `${header}.${payload}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(input);
  const signature = sign.sign(privateKey, "base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${input}.${signature}`;

  const res  = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });
  const json = await res.json() as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Google token error: ${json.error ?? res.statusText}`);
  }

  _cache = { token: json.access_token, expiresAt: Date.now() + 3600_000 };
  return _cache.token;
}
