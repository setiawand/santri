// Data untuk menu Laporan (khusus staf). Tiga jenis, mengikuti format draft Excel:
// pembayaran-santri (kartu iuran satu santri), rekap-bulan (rekap pembayaran satu
// bulan), dan santri-aktif (daftar santri aktif beserta ringkasannya).
import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pembayaran, santri } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isStaff } from "@/lib/authz";
import { BULAN_AJARAN, tahunAjaranSekarang, tahunKalenderBulan } from "@/lib/utils";

export const runtime = "nodejs";

function nominal(p: { iuran: number; infaq: number }) {
  return (p.iuran || 0) + (p.infaq || 0);
}
function sudahBayar(p: { tanggal: Date | null; iuran: number; infaq: number; paraf: boolean }) {
  return !!p.tanggal || nominal(p) > 0 || p.paraf;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const jenis = searchParams.get("jenis");

  // Pilihan filter: daftar periode yang pernah ada + tahun ajaran berjalan.
  if (jenis === "meta") {
    const rows = await db
      .selectDistinct({ periode: pembayaran.periode })
      .from(pembayaran)
      .orderBy(desc(pembayaran.periode));
    const periodeList = rows.map((r) => r.periode);
    const sekarang = tahunAjaranSekarang();
    if (!periodeList.includes(sekarang)) periodeList.unshift(sekarang);
    return NextResponse.json({ periodeList, bulanList: BULAN_AJARAN });
  }

  // Sheet 1: LAP. PEMBY PER SANTRI — 12 bulan untuk satu santri.
  if (jenis === "pembayaran-santri") {
    const santriId = searchParams.get("santriId");
    const periode = searchParams.get("periode") || tahunAjaranSekarang();
    if (!santriId) return NextResponse.json({ error: "santriId wajib" }, { status: 400 });

    const s = await db.query.santri.findFirst({
      where: eq(santri.id, santriId),
      columns: { id: true, nama: true, nis: true, kelas: true },
    });
    if (!s) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 });

    const bayar = await db
      .select()
      .from(pembayaran)
      .where(and(eq(pembayaran.santriId, santriId), eq(pembayaran.periode, periode)));
    const byBulan = new Map(bayar.map((p) => [p.bulan, p]));
    const rows = BULAN_AJARAN.map((bulan) => {
      const p = byBulan.get(bulan);
      return {
        bulan,
        tanggal: p?.tanggal ?? null,
        nominal: p ? nominal(p) : 0,
        metode: p?.metode ?? null,
        lunas: p?.paraf ?? false,
      };
    });
    return NextResponse.json({
      santri: s,
      periode,
      rows,
      total: rows.reduce((a, r) => a + r.nominal, 0),
    });
  }

  // Sheet 2: REKAP PEMBY. PER BULAN — semua santri yang membayar pada bulan tsb.
  if (jenis === "rekap-bulan") {
    const periode = searchParams.get("periode") || tahunAjaranSekarang();
    const bulan = searchParams.get("bulan") || BULAN_AJARAN[0];

    const rows = await db
      .select({
        nama: santri.nama,
        nis: santri.nis,
        tanggal: pembayaran.tanggal,
        iuran: pembayaran.iuran,
        infaq: pembayaran.infaq,
        metode: pembayaran.metode,
        paraf: pembayaran.paraf,
      })
      .from(pembayaran)
      .innerJoin(santri, eq(pembayaran.santriId, santri.id))
      .where(and(eq(pembayaran.periode, periode), eq(pembayaran.bulan, bulan)))
      .orderBy(asc(pembayaran.tanggal), asc(santri.nama));

    const terbayar = rows
      .filter(sudahBayar)
      .map((r) => ({
        nama: r.nama,
        nis: r.nis,
        tanggal: r.tanggal,
        nominal: nominal(r),
        metode: r.metode,
        lunas: r.paraf,
      }));
    return NextResponse.json({
      periode,
      bulan,
      tahun: tahunKalenderBulan(periode, bulan),
      rows: terbayar,
      total: terbayar.reduce((a, r) => a + r.nominal, 0),
    });
  }

  // Sheet 3: DAFTAR SANTRI AKTIF — ringkasan per santri aktif.
  if (jenis === "santri-aktif") {
    const list = await db.query.santri.findMany({
      where: eq(santri.status, "aktif"),
      orderBy: (t, { asc }) => [asc(t.nama)],
      with: {
        pembimbing: { columns: { nama: true } },
        setoran: {
          orderBy: (t, { desc }) => [desc(t.tanggal)],
          limit: 1,
          columns: { surat: true, ayat: true, jilid: true, halaman: true },
        },
        pembayaran: {
          columns: { periode: true, bulan: true, tanggal: true, iuran: true, infaq: true, paraf: true },
        },
      },
    });

    const rows = list.map((s) => {
      const terakhirSetor = s.setoran[0];
      const hafalan = terakhirSetor
        ? [terakhirSetor.surat, terakhirSetor.ayat].filter(Boolean).join(" : ") ||
          [terakhirSetor.jilid, terakhirSetor.halaman].filter(Boolean).join(" / ")
        : null;

      // Pembayaran terakhir = bulan terbayar dengan urutan tahun ajaran paling akhir.
      const terbayar = s.pembayaran
        .filter(sudahBayar)
        .sort(
          (a, b) =>
            a.periode.localeCompare(b.periode) ||
            BULAN_AJARAN.indexOf(a.bulan as (typeof BULAN_AJARAN)[number]) -
              BULAN_AJARAN.indexOf(b.bulan as (typeof BULAN_AJARAN)[number])
        )
        .pop();

      return {
        nama: s.nama,
        pendidikan: s.pendidikan,
        nis: s.nis,
        tanggalMasuk: s.createdAt,
        pembimbing: s.pembimbing?.nama ?? null,
        program: s.programBelajar,
        hafalanTerakhir: hafalan,
        pembayaranTerakhir: terbayar
          ? `${terbayar.bulan} ${tahunKalenderBulan(terbayar.periode, terbayar.bulan) ?? ""}`.trim()
          : null,
      };
    });

    return NextResponse.json({ per: new Date(), rows });
  }

  return NextResponse.json({ error: "Parameter jenis tidak dikenal" }, { status: 400 });
}
