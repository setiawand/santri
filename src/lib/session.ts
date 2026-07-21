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

/** Untuk endpoint khusus admin. Mengembalikan sesi hanya bila role admin, selain itu null. */
export async function requireAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}
