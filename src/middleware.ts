import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Endpoint login/logout selalu boleh diakses.
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  const isLoginPage = pathname === "/login";

  if (!session) {
    if (isLoginPage) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  // Sudah login tapi membuka halaman login -> arahkan ke halaman utama sesuai role.
  if (isLoginPage) {
    const home = session.role === "ortu" ? "/santri" : "/dashboard";
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Orang tua tidak punya dashboard staf, laporan, dan tidak bisa mendaftarkan santri.
  if (
    session.role === "ortu" &&
    (pathname === "/dashboard" ||
      pathname === "/santri/baru" ||
      pathname === "/laporan" ||
      pathname === "/")
  ) {
    return NextResponse.redirect(new URL("/santri", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
