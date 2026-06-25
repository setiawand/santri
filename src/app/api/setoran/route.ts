import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { setoran } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const santriId = searchParams.get("santriId");
  if (!santriId) return NextResponse.json({ error: "santriId wajib" }, { status: 400 });
  const rows = await db
    .select()
    .from(setoran)
    .where(eq(setoran.santriId, santriId))
    .orderBy(desc(setoran.tanggal));
  return NextResponse.json({ setoran: rows });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const b = await req.json();
    if (!b.santriId) return NextResponse.json({ error: "santriId wajib" }, { status: 400 });
    const [created] = await db
      .insert(setoran)
      .values({
        santriId: b.santriId,
        tanggal: b.tanggal ? new Date(b.tanggal) : new Date(),
        periode: b.periode || null,
        jilid: b.jilid || null,
        halaman: b.halaman || null,
        surat: b.surat || null,
        ayat: b.ayat || null,
        keterangan: b.keterangan || null,
        parafGuru: !!b.parafGuru,
        parafOrtu: !!b.parafOrtu,
        createdById: session?.uid ?? null,
      })
      .returning();
    return NextResponse.json({ setoran: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Gagal menyimpan setoran" }, { status: 500 });
  }
}
