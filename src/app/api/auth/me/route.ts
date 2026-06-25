import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: { id: session.uid, nama: session.nama, email: session.email, role: session.role },
  });
}
