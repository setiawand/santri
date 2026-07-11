// Kelola akun login orang tua untuk seorang santri (khusus staf).
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { santri, user } from "@/db/schema";
import { getSession } from "@/lib/session";
import { isStaff } from "@/lib/authz";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

async function requireStaffAndSantri(santriId: string) {
  const session = await getSession();
  if (!isStaff(session)) {
    return { error: NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 }) };
  }
  const found = await db.query.santri.findFirst({
    where: eq(santri.id, santriId),
    columns: { id: true, nama: true, orangtuaUserId: true },
  });
  if (!found) {
    return { error: NextResponse.json({ error: "Santri tidak ditemukan" }, { status: 404 }) };
  }
  return { santri: found };
}

/** Buat akun orang tua baru, atau tautkan akun ortu yang sudah ada (email sama, untuk kakak-adik). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireStaffAndSantri(params.id);
  if (ctx.error) return ctx.error;

  const b = await req.json();
  const email = String(b.email || "").toLowerCase().trim();
  const password = String(b.password || "");
  const nama = String(b.nama || "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }

  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  let ortuId: string;

  if (existing) {
    if (existing.role !== "ortu") {
      return NextResponse.json(
        { error: "Email sudah dipakai akun staf, gunakan email lain" },
        { status: 409 }
      );
    }
    // Akun ortu sudah ada (mis. anak lain sudah terdaftar) -> cukup tautkan.
    ortuId = existing.id;
  } else {
    if (password.length < 6) {
      return NextResponse.json({ error: "Kata sandi minimal 6 karakter" }, { status: 400 });
    }
    const [created] = await db
      .insert(user)
      .values({
        nama: nama || `Orang Tua ${ctx.santri.nama}`,
        email,
        password: await hashPassword(password),
        role: "ortu",
      })
      .returning();
    ortuId = created.id;
  }

  await db.update(santri).set({ orangtuaUserId: ortuId }).where(eq(santri.id, params.id));
  const akun = await db.query.user.findFirst({
    where: eq(user.id, ortuId),
    columns: { id: true, nama: true, email: true },
  });
  return NextResponse.json({ orangtua: akun }, { status: existing ? 200 : 201 });
}

/** Reset kata sandi akun orang tua yang tertaut. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireStaffAndSantri(params.id);
  if (ctx.error) return ctx.error;
  if (!ctx.santri.orangtuaUserId) {
    return NextResponse.json({ error: "Santri belum punya akun orang tua" }, { status: 400 });
  }
  const b = await req.json();
  const password = String(b.password || "");
  if (password.length < 6) {
    return NextResponse.json({ error: "Kata sandi minimal 6 karakter" }, { status: 400 });
  }
  await db
    .update(user)
    .set({ password: await hashPassword(password) })
    .where(eq(user.id, ctx.santri.orangtuaUserId));
  return NextResponse.json({ ok: true });
}

/** Putuskan tautan akun orang tua dari santri ini (akunnya tetap ada). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireStaffAndSantri(params.id);
  if (ctx.error) return ctx.error;
  await db.update(santri).set({ orangtuaUserId: null }).where(eq(santri.id, params.id));
  return NextResponse.json({ ok: true });
}
