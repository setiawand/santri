import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pengeluaran } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isStaff } from "@/lib/authz";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (b.tanggal !== undefined) {
    const t = new Date(b.tanggal);
    if (isNaN(t.getTime())) return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
    data.tanggal = t;
  }
  if (b.kategori !== undefined) data.kategori = b.kategori ? String(b.kategori).trim() : null;
  if (b.keterangan !== undefined) {
    const k = String(b.keterangan).trim();
    if (!k) return NextResponse.json({ error: "Keterangan wajib diisi" }, { status: 400 });
    data.keterangan = k;
  }
  if (b.nominal !== undefined) data.nominal = Math.max(0, parseInt(b.nominal, 10) || 0);
  const [updated] = await db
    .update(pengeluaran)
    .set(data)
    .where(eq(pengeluaran.id, params.id))
    .returning();
  if (!updated) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ pengeluaran: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  await db.delete(pengeluaran).where(eq(pengeluaran.id, params.id));
  return NextResponse.json({ ok: true });
}
