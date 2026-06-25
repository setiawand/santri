import { NextResponse } from "next/server";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { santri, setoran, pembayaran } from "@/db/schema";
import { tahunAjaranSekarang } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  const periode = tahunAjaranSekarang();
  const bulanIdx = new Date().getMonth();
  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const bulanIni = BULAN[bulanIdx];

  const awalBulan = new Date();
  awalBulan.setDate(1); awalBulan.setHours(0, 0, 0, 0);

  const [
    [totalSantri],
    [santriAktif],
    [setoranBulanIni],
    [pembayaranLunas],
    [totalPemasukan],
    terbaru,
  ] = await Promise.all([
    db.select({ value: count() }).from(santri),
    db.select({ value: count() }).from(santri).where(eq(santri.status, "aktif")),
    db.select({ value: count() }).from(setoran).where(gte(setoran.tanggal, awalBulan)),
    db
      .select({ value: count() })
      .from(pembayaran)
      .where(and(eq(pembayaran.periode, periode), eq(pembayaran.bulan, bulanIni), eq(pembayaran.paraf, true))),
    db
      .select({
        iuran: sql<number>`coalesce(sum(${pembayaran.iuran}), 0)`,
        infaq: sql<number>`coalesce(sum(${pembayaran.infaq}), 0)`,
      })
      .from(pembayaran)
      .where(eq(pembayaran.periode, periode)),
    db.query.setoran.findMany({
      limit: 6,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      with: { santri: { columns: { nama: true, id: true } } },
    }),
  ]);

  return NextResponse.json({
    periode,
    bulanIni,
    totalSantri: totalSantri.value,
    santriAktif: santriAktif.value,
    setoranBulanIni: setoranBulanIni.value,
    pembayaranLunas: pembayaranLunas.value,
    pemasukan: (totalPemasukan.iuran ?? 0) + (totalPemasukan.infaq ?? 0),
    setoranTerbaru: terbaru,
  });
}
