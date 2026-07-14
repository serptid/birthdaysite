import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type SessionUser = {
  id: number;
  email: string;
};

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }

  return "birthdaysite-local-dev-session-secret";
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function serializeSession(user: SessionUser) {
  const payload = base64Url(JSON.stringify({ id: user.id, email: user.email }));
  return `${payload}.${sign(payload)}`;
}

export function parseSessionCookie(raw: string | undefined): SessionUser | null {
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  if (!payload || !signature) return null;
  if (!BASE64URL_RE.test(payload) || !BASE64URL_RE.test(signature)) return null;

  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof parsed?.id === "number" &&
      Number.isInteger(parsed.id) &&
      parsed.id > 0 &&
      typeof parsed?.email === "string"
    ) {
      return { id: parsed.id, email: parsed.email };
    }
  } catch {
    return null;
  }

  return null;
}

export async function getSessionUser() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  return parseSessionCookie(raw);
}

export async function setSessionCookie(user: SessionUser) {
  (await cookies()).set(SESSION_COOKIE, serializeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}
