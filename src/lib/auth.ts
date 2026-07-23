import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { UserRole } from "@/db/schema";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret";
const TOKEN_COOKIE = AUTH_COOKIE_NAME;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

/** Extracts + verifies the bearer token from an Authorization header. */
export function verifyBearerToken(authHeader: string | null): AuthTokenPayload | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyAuthToken(authHeader.slice("Bearer ".length).trim());
}

export async function setAuthCookie(token: string) {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
}

export async function getCurrentUser(): Promise<AuthTokenPayload | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

export { AUTH_COOKIE_NAME } from "@/lib/constants";

export function generateApiKey(): string {
  const random = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
  return `mmd_${random}`;
}
