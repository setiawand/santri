import { NextResponse } from "next/server";
import { asc, like, or, sql, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { santri } from "@/db/schema";

export const runtime = "nodejs";

function parseTanggal(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  const rows = await db
    .select({
      ...getTableColumns(santri),
      setoranCount: sql<number>`(select count(*) from "Setoran" where "Setoran"."santriId" = "Santri"."id")`,
      pembayaranCount: sql<number>`(select count(*) from "Pembayaran" where "Pembayaran"."santriId" = "Santri"."id")`,
    })
    .from(santri)
    .where(
      q
        ? or(
            like(santri.nama, `%${q}%`),
            like(santri.nis, `%${q}%`),
            like(santri.kelas, `%${q}%`)
          )
        : undefined
    )
    .orderBy(asc(santri.nama));

  const result = rows.map(({ setoranCount, pembayaranCount, ...s }) => ({
    ...s,
    _count: { setoran: setoranCount, pembayaran: pembayaranCount },
  }));

  return NextResponse.json({ santri: result });
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (!b.nama || !String(b.nama).trim()) {
      return NextResponse.json({ error: "Nama santri wajib diisi" }, { status: 400 });
    }
    const [created] = await db
      .insert(santri)
      .values({
        nama: String(b.nama).trim(),
        nis: b.nis ? String(b.nis).trim() : null,
        tempatLahir: b.tempatLahir || null,
        tanggalLahir: parseTanggal(b.tanggalLahir),
        pendidikan: b.pendidikan || null,
        alamat: b.alamat || null,
        kelas: b.kelas || null,
        namaAyah: b.namaAyah || null,
        hpAyah: b.hpAyah || null,
        pekerjaanAyah: b.pekerjaanAyah || null,
        namaIbu: b.namaIbu || null,
        hpIbu: b.hpIbu || null,
        pekerjaanIbu: b.pekerjaanIbu || null,
        programBelajar: b.programBelajar || null,
        waktuBelajar: b.waktuBelajar || null,
        status: b.status || "aktif",
      })
      .returning();
    return NextResponse.json({ santri: created }, { status: 201 });
  } catch (e: any) {
    if (String(e?.code).includes("SQLITE_CONSTRAINT")) {
      return NextResponse.json({ error: "NIS sudah digunakan santri lain" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
