import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { setoran } from "@/db/schema";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const data: Record<string, unknown> = {};
  if (b.tanggal !== undefined) data.tanggal = b.tanggal ? new Date(b.tanggal) : new Date();
  for (const k of ["periode", "jilid", "halaman", "surat", "ayat", "keterangan"]) {
    if (b[k] !== undefined) data[k] = b[k] || null;
  }
  if (b.parafGuru !== undefined) data.parafGuru = !!b.parafGuru;
  if (b.parafOrtu !== undefined) data.parafOrtu = !!b.parafOrtu;
  const [updated] = await db
    .update(setoran)
    .set(data)
    .where(eq(setoran.id, params.id))
    .returning();
  return NextResponse.json({ setoran: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await db.delete(setoran).where(eq(setoran.id, params.id));
  return NextResponse.json({ ok: true });
}
