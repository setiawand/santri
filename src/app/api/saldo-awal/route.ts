// Override manual saldo awal suatu bulan (titik mulai carry-over), khusus admin.
// Kirim nominal untuk set/ubah override; kirim nominal: null untuk kembali ke otomatis.
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { saldoAwal } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/authz";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const b = await req.json();
  const periode = String(b.periode || "").trim();
  const bulan = String(b.bulan || "").trim();
  if (!periode || !bulan) {
    return NextResponse.json({ error: "periode dan bulan wajib" }, { status: 400 });
  }

  if (b.nominal === null) {
    await db
      .delete(saldoAwal)
      .where(and(eq(saldoAwal.periode, periode), eq(saldoAwal.bulan, bulan)));
    return NextResponse.json({ ok: true, override: false });
  }

  const nominal = Math.max(0, parseInt(b.nominal, 10) || 0);
  const existing = await db.query.saldoAwal.findFirst({
    where: and(eq(saldoAwal.periode, periode), eq(saldoAwal.bulan, bulan)),
  });
  if (existing) {
    await db.update(saldoAwal).set({ nominal }).where(eq(saldoAwal.id, existing.id));
  } else {
    await db.insert(saldoAwal).values({ periode, bulan, nominal, createdById: session?.uid ?? null });
  }
  return NextResponse.json({ ok: true, override: true, nominal });
}
