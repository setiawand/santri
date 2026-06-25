import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { signToken, COOKIE_NAME } from "@/lib/jwt";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email dan kata sandi wajib diisi" }, { status: 400 });
    }

    const found = await db.query.user.findFirst({
      where: eq(user.email, String(email).toLowerCase().trim()),
    });
    if (!found || !(await verifyPassword(password, found.password))) {
      return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
    }

    const token = await signToken({
      uid: found.id,
      nama: found.nama,
      email: found.email,
      role: found.role,
    });

    const res = NextResponse.json({
      user: { id: found.id, nama: found.nama, email: found.email, role: found.role },
    });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
