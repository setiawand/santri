import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { santri } from "@/db/schema";

export const runtime = "nodejs";

function parseTanggal(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const found = await db.query.santri.findFirst({
    where: eq(santri.id, params.id),
    with: {
      setoran: { orderBy: (t, { desc }) => [desc(t.tanggal)] },
      pembayaran: { orderBy: (t, { asc }) => [asc(t.updatedAt)] },
    },
  });
  if (!found) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ santri: found });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const b = await req.json();
    const [updated] = await db
      .update(santri)
      .set({
        nama: b.nama?.trim(),
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
      .where(eq(santri.id, params.id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ santri: updated });
  } catch (e: any) {
    if (String(e?.code).includes("SQLITE_CONSTRAINT")) {
      return NextResponse.json({ error: "NIS sudah digunakan santri lain" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal memperbarui data" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.delete(santri).where(eq(santri.id, params.id));
  return NextResponse.json({ ok: true });
}
