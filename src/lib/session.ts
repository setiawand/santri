import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken, type SessionPayload } from "./jwt";

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Untuk dipakai di API route. Mengembalikan sesi atau melempar 401 lewat pengecekan manual. */
export async function requireSession(): Promise<SessionPayload | null> {
  return getSession();
}
