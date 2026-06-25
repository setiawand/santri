import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pembayaran } from "@/db/schema";
import { BULAN_AJARAN, tahunAjaranSekarang } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const santriId = searchParams.get("santriId");
  const periode = searchParams.get("periode") || tahunAjaranSekarang();
  if (!santriId) return NextResponse.json({ error: "santriId wajib" }, { status: 400 });

  let rows = await db
    .select()
    .from(pembayaran)
    .where(and(eq(pembayaran.santriId, santriId), eq(pembayaran.periode, periode)));

  // Auto-generate 12 baris bulan jika periode ini belum ada (satu bulk insert).
  if (rows.length === 0) {
    await db
      .insert(pembayaran)
      .values(BULAN_AJARAN.map((bulan) => ({ santriId, periode, bulan })));
    rows = await db
      .select()
      .from(pembayaran)
      .where(and(eq(pembayaran.santriId, santriId), eq(pembayaran.periode, periode)));
  }

  // Urutkan sesuai urutan bulan ajaran.
  rows.sort(
    (a, b) =>
      BULAN_AJARAN.indexOf(a.bulan as any) - BULAN_AJARAN.indexOf(b.bulan as any)
  );

  // Daftar periode yang pernah dibuat untuk santri ini.
  const periodeList = await db
    .selectDistinct({ periode: pembayaran.periode })
    .from(pembayaran)
    .where(eq(pembayaran.santriId, santriId))
    .orderBy(desc(pembayaran.periode));

  return NextResponse.json({
    periode,
    pembayaran: rows,
    periodeTersedia: periodeList.map((p) => p.periode),
  });
}
