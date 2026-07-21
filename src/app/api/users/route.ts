import { NextResponse } from "next/server";
import { asc, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getSession, requireAdmin } from "@/lib/session";
import { isStaff } from "@/lib/authz";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

// Role yang bisa dikelola dari halaman manajemen pengguna.
// Akun "ortu" dibuat lewat halaman detail santri, bukan dari sini.
const ROLES = ["admin", "guru"] as const;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Mode lengkap (halaman manajemen pengguna) — khusus admin.
  if (searchParams.get("full")) {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Hanya admin yang boleh mengakses" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        setoranCount: sql<number>`(select count(*) from "Setoran" where "Setoran"."createdById" = "User"."id")`,
        pembayaranCount: sql<number>`(select count(*) from "Pembayaran" where "Pembayaran"."createdById" = "User"."id")`,
      })
      .from(user)
      .orderBy(asc(user.nama));

    const result = rows.map(({ setoranCount, pembayaranCount, ...u }) => ({
      ...u,
      _count: { setoran: setoranCount, pembayaran: pembayaranCount },
    }));

    return NextResponse.json({ users: result });
  }

  // Mode ringkas — daftar staf untuk pilihan pembimbing santri, boleh diakses guru.
  const session = await getSession();
  if (!isStaff(session)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  const rows = await db
    .select({ id: user.id, nama: user.nama, role: user.role })
    .from(user)
    .where(ne(user.role, "ortu"))
    .orderBy(asc(user.nama));
  return NextResponse.json({ users: rows });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Hanya admin yang boleh mengakses" }, { status: 403 });
  }

  try {
    const b = await req.json();
    const nama = String(b.nama || "").trim();
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    const role = String(b.role || "guru");

    if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
    }
    if (!ROLES.includes(role as (typeof ROLES)[number])) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    const [created] = await db
      .insert(user)
      .values({ nama, email, password: await hashPassword(password), role })
      .returning();
    const { password: _pw, ...safe } = created;
    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (e: any) {
    if (String(e?.code).includes("SQLITE_CONSTRAINT")) {
      return NextResponse.json({ error: "Email sudah digunakan pengguna lain" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}
