import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { user, setoran, pembayaran } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

const ROLES = ["admin", "guru"] as const;

async function countAdmin(): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)` })
    .from(user)
    .where(eq(user.role, "admin"));
  return row?.c ?? 0;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Hanya admin yang boleh mengakses" }, { status: 403 });
  }

  const target = await db.query.user.findFirst({ where: eq(user.id, params.id) });
  if (!target) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  try {
    const b = await req.json();
    const patch: Partial<typeof user.$inferInsert> = {};

    if (b.nama !== undefined) {
      const nama = String(b.nama).trim();
      if (!nama) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
      patch.nama = nama;
    }
    if (b.email !== undefined) {
      const email = String(b.email).trim().toLowerCase();
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
      }
      patch.email = email;
    }
    if (b.password !== undefined && String(b.password) !== "") {
      const password = String(b.password);
      if (password.length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
      }
      patch.password = await hashPassword(password);
    }
    if (b.role !== undefined && String(b.role) !== target.role) {
      const role = String(b.role);
      if (!ROLES.includes(role as (typeof ROLES)[number])) {
        return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
      }
      if (target.role === "ortu" && role !== "ortu") {
        return NextResponse.json(
          { error: "Role akun orang tua tidak bisa diubah" },
          { status: 400 }
        );
      }
      if (target.role === "admin" && role === "guru") {
        if (target.id === session.uid) {
          return NextResponse.json(
            { error: "Tidak bisa menurunkan role akun sendiri" },
            { status: 400 }
          );
        }
        if ((await countAdmin()) <= 1) {
          return NextResponse.json(
            { error: "Tidak bisa menurunkan admin terakhir" },
            { status: 400 }
          );
        }
      }
      patch.role = role;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
    }

    const [updated] = await db.update(user).set(patch).where(eq(user.id, params.id)).returning();
    const { password: _pw, ...safe } = updated;
    return NextResponse.json({ user: safe });
  } catch (e: any) {
    if (String(e?.code).includes("SQLITE_CONSTRAINT")) {
      return NextResponse.json({ error: "Email sudah digunakan pengguna lain" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal memperbarui data" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Hanya admin yang boleh mengakses" }, { status: 403 });
  }

  if (params.id === session.uid) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }

  const target = await db.query.user.findFirst({ where: eq(user.id, params.id) });
  if (!target) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }
  if (target.role === "admin" && (await countAdmin()) <= 1) {
    return NextResponse.json({ error: "Tidak bisa menghapus admin terakhir" }, { status: 400 });
  }

  // Lepas jejak penginput di catatan lama agar riwayat setoran/pembayaran tetap utuh.
  db.transaction((tx) => {
    tx.update(setoran).set({ createdById: null }).where(eq(setoran.createdById, params.id)).run();
    tx.update(pembayaran)
      .set({ createdById: null })
      .where(eq(pembayaran.createdById, params.id))
      .run();
    tx.delete(user).where(eq(user.id, params.id)).run();
  });

  return NextResponse.json({ ok: true });
}
