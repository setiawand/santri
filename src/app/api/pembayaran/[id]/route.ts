import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pembayaran } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/authz";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (session?.uid) data.createdById = session.uid;
  if (b.tanggal !== undefined) data.tanggal = b.tanggal ? new Date(b.tanggal) : null;
  if (b.iuran !== undefined) data.iuran = Math.max(0, parseInt(b.iuran, 10) || 0);
  if (b.infaq !== undefined) data.infaq = Math.max(0, parseInt(b.infaq, 10) || 0);
  if (b.metode !== undefined) {
    data.metode = ["TUNAI", "TRANSFER", "QRIS"].includes(b.metode) ? b.metode : null;
  }
  if (b.paraf !== undefined) data.paraf = !!b.paraf;
  const [updated] = await db
    .update(pembayaran)
    .set(data)
    .where(eq(pembayaran.id, params.id))
    .returning();
  return NextResponse.json({ pembayaran: updated });
}
