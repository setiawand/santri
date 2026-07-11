// Helper otorisasi berbasis role. Role: "admin" | "guru" (staf) | "ortu" (orang tua).
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { santri } from "@/db/schema";
import type { SessionPayload } from "./jwt";

export function isStaff(session: SessionPayload | null): boolean {
  return !!session && (session.role === "admin" || session.role === "guru");
}

export function isOrtu(session: SessionPayload | null): boolean {
  return session?.role === "ortu";
}

/** Apakah user ortu ini orang tua dari santri tersebut. */
export async function isOrtuOf(uid: string, santriId: string): Promise<boolean> {
  const found = await db.query.santri.findFirst({
    where: eq(santri.id, santriId),
    columns: { orangtuaUserId: true },
  });
  return found?.orangtuaUserId === uid;
}

/** Boleh melihat data santri: staf selalu boleh, ortu hanya anaknya sendiri. */
export async function canViewSantri(
  session: SessionPayload | null,
  santriId: string
): Promise<boolean> {
  if (isStaff(session)) return true;
  if (isOrtu(session)) return isOrtuOf(session!.uid, santriId);
  return false;
}
