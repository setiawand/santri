// Pencatatan pemasukan operasional lain-lain bulanan (khusus admin).
import { NextResponse } from "next/server";
import { and, asc, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { pemasukanLain } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isAdmin } from "@/lib/authz";
import { BULAN_AJARAN, rentangBulan, tahunAjaranSekarang, tahunKalenderBulan } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") || tahunAjaranSekarang();
  const bulan = searchParams.get("bulan") || BULAN_AJARAN[0];
  const rentang = rentangBulan(periode, bulan);
  if (!rentang) return NextResponse.json({ error: "Periode/bulan tidak valid" }, { status: 400 });

  const rows = await db
    .select()
    .from(pemasukanLain)
    .where(and(gte(pemasukanLain.tanggal, rentang[0]), lt(pemasukanLain.tanggal, rentang[1])))
    .orderBy(asc(pemasukanLain.tanggal), asc(pemasukanLain.createdAt));

  return NextResponse.json({
    periode,
    bulan,
    tahun: tahunKalenderBulan(periode, bulan),
    pemasukanLain: rows,
    total: rows.reduce((a, r) => a + (r.nominal || 0), 0),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  try {
    const b = await req.json();
    const keterangan = String(b.keterangan || "").trim();
    if (!keterangan) {
      return NextResponse.json({ error: "Keterangan wajib diisi" }, { status: 400 });
    }
    const tanggal = b.tanggal ? new Date(b.tanggal) : new Date();
    if (isNaN(tanggal.getTime())) {
      return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
    }
    const [created] = await db
      .insert(pemasukanLain)
      .values({
        tanggal,
        kategori: b.kategori ? String(b.kategori).trim() : null,
        keterangan,
        nominal: Math.max(0, parseInt(b.nominal, 10) || 0),
        createdById: session?.uid ?? null,
      })
      .returning();
    return NextResponse.json({ pemasukanLain: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan pemasukan lain" }, { status: 500 });
  }
}
