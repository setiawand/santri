import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { setoran } from "@/db/schema";
import { getSession } from "@/lib/session";
import { canInputSetoran, isOrtu, isOrtuOf, isStaff } from "@/lib/authz";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  const b = await req.json();
  const data: Record<string, unknown> = {};

  if (isOrtu(session)) {
    // Orang tua hanya boleh membubuhkan paraf ortu pada setoran anaknya sendiri.
    const found = await db.query.setoran.findFirst({
      where: eq(setoran.id, params.id),
      columns: { santriId: true },
    });
    if (!found || !(await isOrtuOf(session!.uid, found.santriId))) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
    if (b.parafOrtu === undefined) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
    }
    data.parafOrtu = !!b.parafOrtu;
  } else if (isStaff(session)) {
    const found = await db.query.setoran.findFirst({
      where: eq(setoran.id, params.id),
      columns: { santriId: true },
    });
    if (!found || !(await canInputSetoran(session, found.santriId))) {
      return NextResponse.json(
        { error: "Hanya pembimbing santri ini (atau admin) yang boleh mengubah setoran" },
        { status: 403 }
      );
    }
    if (b.tanggal !== undefined) data.tanggal = b.tanggal ? new Date(b.tanggal) : new Date();
    for (const k of ["periode", "jilid", "halaman", "surat", "ayat", "keterangan"]) {
      if (b[k] !== undefined) data[k] = b[k] || null;
    }
    if (b.parafGuru !== undefined) data.parafGuru = !!b.parafGuru;
    if (b.parafOrtu !== undefined) data.parafOrtu = !!b.parafOrtu;
  } else {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const [updated] = await db
    .update(setoran)
    .set(data)
    .where(eq(setoran.id, params.id))
    .returning();
  return NextResponse.json({ setoran: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const found = await db.query.setoran.findFirst({
    where: eq(setoran.id, params.id),
    columns: { santriId: true },
  });
  if (!found || !(await canInputSetoran(session, found.santriId))) {
    return NextResponse.json(
      { error: "Hanya pembimbing santri ini (atau admin) yang boleh menghapus setoran" },
      { status: 403 }
    );
  }
  await db.delete(setoran).where(eq(setoran.id, params.id));
  return NextResponse.json({ ok: true });
}
