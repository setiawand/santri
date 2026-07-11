// Daftar user staf (admin/guru) — dipakai untuk pilihan pembimbing santri.
import { NextResponse } from "next/server";
import { asc, ne } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isStaff } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const rows = await db
    .select({ id: user.id, nama: user.nama, role: user.role })
    .from(user)
    .where(ne(user.role, "ortu"))
    .orderBy(asc(user.nama));
  return NextResponse.json({ users: rows });
}
