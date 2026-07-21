# Login Orang Tua — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan role `ortu` agar orang tua bisa login dan melihat data setoran & pembayaran anaknya secara read-only, serta admin dapat membuat akun ortu dan menautkannya ke santri.

**Architecture:** Tambah tabel junction `SantriOrtu` untuk relasi many-to-many user ↔ santri. Role `ortu` masuk ke route group `(portal)` yang terpisah dari `(app)`. Middleware diperluas untuk memblokir ortu dari halaman admin dan non-ortu dari halaman portal.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM + SQLite (better-sqlite3), jose JWT, Tailwind CSS.

## Global Constraints

- Semua route tetap dijaga JWT cookie `mq_session`, tidak ada perubahan mekanisme auth.
- `npm run build` harus lulus tanpa error setelah setiap task.
- Tidak ada test suite — verifikasi dengan `npm run build` + manual test di `npm run dev`.
- Nama tabel baru menggunakan PascalCase konsisten dengan tabel lain.
- Tidak ada dependency baru yang perlu ditambahkan.

---

## File Map

| File | Status | Tanggung jawab |
|------|--------|----------------|
| `src/db/schema.ts` | Modify | Tambah tabel `SantriOrtu` + relasi |
| `src/middleware.ts` | Modify | Routing berdasarkan role |
| `src/app/(portal)/layout.tsx` | Create | Layout portal ortu |
| `src/app/(portal)/portal/page.tsx` | Create | Halaman utama portal — daftar anak |
| `src/app/(portal)/portal/santri/[id]/page.tsx` | Create | Detail anak (read-only) |
| `src/app/api/portal/santri/route.ts` | Create | GET anak yang ditautkan ke ortu sesi |
| `src/app/api/portal/santri/[id]/route.ts` | Create | GET detail anak + validasi tautan |
| `src/app/api/santri/[id]/ortu/route.ts` | Create | Admin: GET/POST/DELETE tautan ortu |
| `src/app/api/admin/users/route.ts` | Create | Admin: POST buat akun user baru |
| `src/components/OrtuPanel.tsx` | Create | Admin: panel kelola akun ortu di halaman santri |
| `src/components/SetoranPanel.tsx` | Modify | Tambah prop `readOnly?: boolean` |
| `src/components/PembayaranPanel.tsx` | Modify | Tambah prop `readOnly?: boolean` |
| `src/app/(app)/santri/[id]/page.tsx` | Modify | Tambah tab "Orang Tua" (admin only) |
| `src/db/seed.ts` | Modify | Tambah akun ortu contoh |

---

### Task 1: Tambah tabel SantriOrtu ke schema

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: exported `santriOrtu` table, `santriOrtuRelations`

- [ ] **Step 1: Edit `src/db/schema.ts` — tambah tabel dan relasi**

Tambahkan di akhir file (setelah `pembayaranRelations`), dan update `santriRelations` + `userRelations`:

```ts
// Tambah di akhir file:
export const santriOrtu = sqliteTable(
  "SantriOrtu",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    santriId: text("santriId")
      .notNull()
      .references(() => santri.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => ({
    uniq: uniqueIndex("SantriOrtu_santriId_userId_key").on(t.santriId, t.userId),
    userIdx: index("SantriOrtu_userId_idx").on(t.userId),
  })
);

export const santriOrtuRelations = relations(santriOrtu, ({ one }) => ({
  santri: one(santri, { fields: [santriOrtu.santriId], references: [santri.id] }),
  user: one(user, { fields: [santriOrtu.userId], references: [user.id] }),
}));
```

Update `santriRelations`:
```ts
export const santriRelations = relations(santri, ({ many }) => ({
  setoran: many(setoran),
  pembayaran: many(pembayaran),
  santriOrtu: many(santriOrtu),
}));
```

Update `userRelations`:
```ts
export const userRelations = relations(user, ({ many }) => ({
  setoran: many(setoran),
  pembayaran: many(pembayaran),
  santriOrtu: many(santriOrtu),
}));
```

- [ ] **Step 2: Push schema ke database**

```bash
npm run db:push
```

Expected: `SantriOrtu` table terbuat tanpa error.

- [ ] **Step 3: Verifikasi build**

```bash
npm run build
```

Expected: lulus tanpa error TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: tambah tabel SantriOrtu untuk relasi ortu-santri"
```

---

### Task 2: Update middleware — routing berdasarkan role

**Files:**
- Modify: `src/middleware.ts`

**Interfaces:**
- Consumes: `SessionPayload.role` (string) dari `verifyToken`
- Produces: ortu → redirect ke `/portal`; non-ortu → redirect ke `/dashboard` jika coba akses `/portal`

- [ ] **Step 1: Ganti isi `src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoginPage) {
    const dest = session.role === "ortu" ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  const isPortal = pathname.startsWith("/portal") || pathname.startsWith("/api/portal/");
  const isAdminApp = !isPortal && !isLoginPage;

  if (session.role === "ortu" && isAdminApp) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  if (session.role !== "ortu" && isPortal) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
```

- [ ] **Step 2: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware — routing role ortu ke /portal"
```

---

### Task 3: API portal — data anak untuk ortu

**Files:**
- Create: `src/app/api/portal/santri/route.ts`
- Create: `src/app/api/portal/santri/[id]/route.ts`

**Interfaces:**
- Consumes: `SantriOrtu` table, session dari cookie
- Produces:
  - `GET /api/portal/santri` → `{ santri: Array<{id, nama, nis, kelas, status}> }`
  - `GET /api/portal/santri/[id]` → `{ santri, setoran: Setoran[], pembayaran: Pembayaran[], periode: string, periodeTersedia: string[] }`

- [ ] **Step 1: Buat `src/app/api/portal/santri/route.ts`**

```ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { santriOrtu, santri } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ortu") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const links = await db.query.santriOrtu.findMany({
    where: eq(santriOrtu.userId, session.uid),
    with: { santri: true },
  });

  return NextResponse.json({ santri: links.map((l) => l.santri) });
}
```

- [ ] **Step 2: Buat `src/app/api/portal/santri/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { santriOrtu, santri, setoran, pembayaran } from "@/db/schema";
import { getSession } from "@/lib/session";
import { tahunAjaranSekarang } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "ortu") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const link = await db.query.santriOrtu.findFirst({
    where: and(eq(santriOrtu.userId, session.uid), eq(santriOrtu.santriId, params.id)),
  });
  if (!link) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const periodeParam = searchParams.get("periode");

  const [santriData, allPembayaran, allSetoran] = await Promise.all([
    db.query.santri.findFirst({ where: eq(santri.id, params.id) }),
    db.select().from(pembayaran).where(eq(pembayaran.santriId, params.id)),
    db.select().from(setoran)
      .where(eq(setoran.santriId, params.id))
      .orderBy(desc(setoran.tanggal)),
  ]);

  const periodeTersedia = [...new Set(allPembayaran.map((p) => p.periode))].sort().reverse();
  const periode = periodeParam || periodeTersedia[0] || tahunAjaranSekarang();
  const pembayaranFiltered = allPembayaran.filter((p) => p.periode === periode);

  return NextResponse.json({
    santri: santriData,
    setoran: allSetoran,
    pembayaran: pembayaranFiltered,
    periode,
    periodeTersedia,
  });
}
```

- [ ] **Step 3: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/portal/
git commit -m "feat: API portal ortu — daftar dan detail anak"
```

---

### Task 4: API admin — buat user & kelola tautan ortu

**Files:**
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/santri/[id]/ortu/route.ts`

**Interfaces:**
- Consumes: `user`, `santriOrtu` tables; session harus role `admin`
- Produces:
  - `POST /api/admin/users` body `{nama, email, password, role}` → `{ user: {id, nama, email, role} }`
  - `GET /api/santri/[id]/ortu` → `{ ortu: Array<{id, nama, email}> }`
  - `POST /api/santri/[id]/ortu` body `{userId}` → `{ ok: true }`
  - `DELETE /api/santri/[id]/ortu` body `{userId}` → `{ ok: true }`

- [ ] **Step 1: Buat `src/app/api/admin/users/route.ts`**

```ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { nama, email, password, role } = await req.json();
  if (!nama || !email || !password || !role) {
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  try {
    const hashed = await hashPassword(String(password));
    const [created] = await db
      .insert(user)
      .values({ nama: String(nama).trim(), email: String(email).toLowerCase().trim(), password: hashed, role: String(role) })
      .returning({ id: user.id, nama: user.nama, email: user.email, role: user.role });
    return NextResponse.json({ user: created }, { status: 201 });
  } catch (e: any) {
    if (String(e?.code).includes("SQLITE_CONSTRAINT")) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal membuat akun" }, { status: 500 });
  }
}
```

Cek `src/lib/password.ts` — pastikan ada fungsi `hashPassword`. Jika nama fungsinya `hashPassword` belum ada (kemungkinan bernama `hashPassword` atau `hash`), sesuaikan:

```ts
// src/lib/password.ts — tambahkan alias jika perlu
export { hashPassword } from "./password"; // atau sesuaikan nama yang sudah ada
```

Baca dulu `src/lib/password.ts` dan gunakan nama fungsi yang sudah ada.

- [ ] **Step 2: Buat `src/app/api/santri/[id]/ortu/route.ts`**

```ts
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { santriOrtu, user } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const links = await db.query.santriOrtu.findMany({
    where: eq(santriOrtu.santriId, params.id),
    with: { user: { columns: { id: true, nama: true, email: true } } },
  });

  return NextResponse.json({ ortu: links.map((l) => l.user) });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });

  try {
    await db.insert(santriOrtu).values({ santriId: params.id, userId: String(userId) });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.code).includes("SQLITE_CONSTRAINT")) {
      return NextResponse.json({ error: "Sudah ditautkan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal menautkan" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { userId } = await req.json();
  await db.delete(santriOrtu).where(
    and(eq(santriOrtu.santriId, params.id), eq(santriOrtu.userId, String(userId)))
  );
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/ src/app/api/santri/
git commit -m "feat: API admin — buat user dan kelola tautan ortu per santri"
```

---

### Task 5: Tambah prop readOnly ke SetoranPanel & PembayaranPanel

**Files:**
- Modify: `src/components/SetoranPanel.tsx`
- Modify: `src/components/PembayaranPanel.tsx`

**Interfaces:**
- Produces: `SetoranPanel` menerima `readOnly?: boolean` — jika true, sembunyikan form tambah setoran dan tombol hapus
- Produces: `PembayaranPanel` menerima `readOnly?: boolean` — jika true, input jadi `disabled`, tombol paraf jadi tampilan saja

- [ ] **Step 1: Baca `src/components/SetoranPanel.tsx`** untuk memahami struktur sebelum edit.

- [ ] **Step 2: Edit `SetoranPanel` — tambah prop `readOnly`**

Ubah signature fungsi:
```tsx
export function SetoranPanel({ santriId, readOnly = false }: { santriId: string; readOnly?: boolean }) {
```

Di dalam JSX, sembunyikan form tambah dan tombol hapus ketika `readOnly`:
```tsx
{!readOnly && (
  /* form tambah setoran dan tombol hapus */
)}
```

- [ ] **Step 3: Edit `PembayaranPanel` — tambah prop `readOnly`**

Ubah signature:
```tsx
export function PembayaranPanel({ santriId, readOnly = false }: { santriId: string; readOnly?: boolean }) {
```

Pada input iuran, infaq, tanggal — tambahkan `disabled={readOnly}`:
```tsx
<input
  type="date"
  className="input-field py-1 text-xs"
  disabled={readOnly}
  value={b.tanggal ? b.tanggal.slice(0, 10) : ""}
  onChange={readOnly ? undefined : (e) => setLocal(b.id, { tanggal: e.target.value })}
  onBlur={readOnly ? undefined : (e) => save(b.id, { tanggal: e.target.value })}
/>
```

Pada tombol paraf — tampilkan ikon saja tanpa `onClick` ketika readOnly:
```tsx
<button
  onClick={readOnly ? undefined : () => { const nv = !b.paraf; setLocal(b.id, { paraf: nv }); save(b.id, { paraf: nv }); }}
  disabled={readOnly}
  className={`h-6 w-6 rounded-full inline-flex items-center justify-center transition ${
    b.paraf ? "bg-emerald text-white" : "bg-stone-100 text-stone-300"
  } ${readOnly ? "cursor-default" : "hover:bg-stone-200"}`}
>
  {b.paraf ? <Check size={14} /> : <X size={14} />}
</button>
```

Sembunyikan teks "Perubahan tersimpan otomatis" ketika readOnly:
```tsx
{!readOnly && (
  <p className="text-xs text-stone-400 mt-3 ...">Perubahan tersimpan otomatis. ...</p>
)}
```

- [ ] **Step 4: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/SetoranPanel.tsx src/components/PembayaranPanel.tsx
git commit -m "feat: tambah prop readOnly ke SetoranPanel dan PembayaranPanel"
```

---

### Task 6: Buat portal route group (layout + halaman)

**Files:**
- Create: `src/app/(portal)/layout.tsx`
- Create: `src/app/(portal)/portal/page.tsx`
- Create: `src/app/(portal)/portal/santri/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/portal/santri`, `GET /api/portal/santri/[id]`
- Produces: halaman portal yang hanya bisa diakses role `ortu`

- [ ] **Step 1: Buat `src/app/(portal)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo } from "@/components/Logo";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "ortu") redirect("/login");

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-arabesque text-white px-5 py-4 flex items-center gap-3">
        <div className="bg-white rounded-lg p-1">
          <Logo size={28} />
        </div>
        <div>
          <p className="font-serif text-lg leading-none">Markaz Qur'an Bekasi</p>
          <p className="text-[11px] text-gold-light">Portal Orang Tua</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm text-white/90">{session.nama}</p>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-xs text-cream-dark/70 hover:text-white">Keluar</button>
          </form>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-5 sm:p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Buat `src/app/(portal)/portal/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, User, ChevronRight } from "lucide-react";

interface Anak {
  id: string;
  nama: string;
  nis: string | null;
  kelas: string | null;
  status: string;
}

export default function PortalPage() {
  const [anak, setAnak] = useState<Anak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/santri")
      .then((r) => r.json())
      .then((d) => { setAnak(d.santri || []); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-stone-400">
        <Loader2 className="animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">Putra/Putri Anda</h1>
      <p className="text-stone-500 text-sm mb-6">Pilih santri untuk melihat catatan setoran dan pembayaran.</p>

      {anak.length === 0 ? (
        <div className="card p-8 text-center text-stone-400">
          Belum ada data santri yang ditautkan ke akun ini. Hubungi admin Markaz Qur'an.
        </div>
      ) : (
        <ul className="space-y-3">
          {anak.map((a) => (
            <li key={a.id}>
              <Link
                href={`/portal/santri/${a.id}`}
                className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-arabesque/10 flex items-center justify-center text-arabesque font-serif text-xl">
                  {a.nama.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink">{a.nama}</p>
                  <p className="text-sm text-stone-500">
                    {[a.nis && `NIS: ${a.nis}`, a.kelas].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "aktif" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                    {a.status === "aktif" ? "Aktif" : "Non-aktif"}
                  </span>
                  <ChevronRight size={18} className="text-stone-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Buat `src/app/(portal)/portal/santri/[id]/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Loader2, BookOpenCheck, Wallet, User } from "lucide-react";
import { SetoranPanel } from "@/components/SetoranPanel";
import { PembayaranPanel } from "@/components/PembayaranPanel";
import { formatTanggal } from "@/lib/utils";

type Tab = "profil" | "setoran" | "pembayaran";

interface AnakDetail {
  id: string;
  nama: string;
  nis: string | null;
  kelas: string | null;
  status: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  pendidikan: string | null;
  alamat: string | null;
  programBelajar: string | null;
  waktuBelajar: string | null;
}

export default function PortalAnakPage() {
  const params = useParams<{ id: string }>();
  const [anak, setAnak] = useState<AnakDetail | null>(null);
  const [tab, setTab] = useState<Tab>("profil");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/santri/${params.id}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((d) => d && setAnak(d.santri));
  }, [params.id]);

  if (notFound) {
    return (
      <div className="text-center text-stone-500 py-12">
        Data tidak ditemukan.{" "}
        <Link href="/portal" className="text-emerald underline">Kembali</Link>
      </div>
    );
  }
  if (!anak) {
    return (
      <div className="flex items-center justify-center h-40 text-stone-400">
        <Loader2 className="animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "profil", label: "Profil", icon: User },
    { id: "setoran", label: "Setoran Tilawah", icon: BookOpenCheck },
    { id: "pembayaran", label: "Pembayaran", icon: Wallet },
  ];

  return (
    <div>
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-emerald mb-4">
        <ChevronLeft size={16} /> Daftar Santri
      </Link>

      <div className="card p-5 mb-5 bg-arabesque text-cream">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gold/25 flex items-center justify-center text-xl font-serif text-white">
            {anak.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-2xl text-white">{anak.nama}</h1>
            <p className="text-sm text-cream-dark/80">
              {[anak.nis && `NIS: ${anak.nis}`, anak.kelas].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 border-b border-cream-dark">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                active ? "border-emerald text-emerald" : "border-transparent text-stone-500 hover:text-ink"
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profil" && (
        <div className="card p-5 space-y-2">
          {[
            ["Pendidikan", anak.pendidikan],
            ["Tempat, Tgl Lahir", [anak.tempatLahir, anak.tanggalLahir ? formatTanggal(anak.tanggalLahir) : ""].filter(Boolean).join(", ")],
            ["Alamat", anak.alamat],
            ["Program Belajar", anak.programBelajar],
            ["Waktu Belajar", anak.waktuBelajar],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-2 py-2 border-b border-cream-dark last:border-0">
              <span className="text-sm text-stone-500">{label}</span>
              <span className="col-span-2 text-sm text-ink font-medium">{value || "-"}</span>
            </div>
          ))}
        </div>
      )}
      {tab === "setoran" && <SetoranPanel santriId={params.id} readOnly />}
      {tab === "pembayaran" && <PembayaranPanel santriId={params.id} readOnly />}
    </div>
  );
}
```

- [ ] **Step 4: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(portal)/
git commit -m "feat: portal orang tua — layout, daftar anak, detail anak read-only"
```

---

### Task 7: OrtuPanel di halaman admin santri + seed akun contoh

**Files:**
- Create: `src/components/OrtuPanel.tsx`
- Modify: `src/app/(app)/santri/[id]/page.tsx`
- Modify: `src/db/seed.ts`

**Interfaces:**
- Consumes: `GET /api/santri/[id]/ortu`, `POST /api/santri/[id]/ortu`, `DELETE /api/santri/[id]/ortu`, `POST /api/admin/users`
- Produces: Tab "Orang Tua" di halaman detail santri (hanya tampil untuk admin)

- [ ] **Step 1: Buat `src/components/OrtuPanel.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, UserPlus, X } from "lucide-react";

interface OrtuUser {
  id: string;
  nama: string;
  email: string;
}

export function OrtuPanel({ santriId }: { santriId: string }) {
  const [list, setList] = useState<OrtuUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/santri/${santriId}/ortu`);
    const data = await res.json();
    setList(data.ortu || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [santriId]);

  async function tambahOrtu(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    // Buat akun user ortu
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "ortu" }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Gagal"); setSaving(false); return; }
    // Tautkan ke santri
    await fetch(`/api/santri/${santriId}/ortu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.user.id }),
    });
    setForm({ nama: "", email: "", password: "" });
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function hapus(userId: string) {
    if (!confirm("Hapus akun orang tua ini?")) return;
    await fetch(`/api/santri/${santriId}/ortu`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    load();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl text-ink">Akun Orang Tua</h3>
        <button onClick={() => setShowForm((v) => !v)} className="btn btn-primary text-sm">
          {showForm ? <X size={16} /> : <UserPlus size={16} />}
          {showForm ? "Batal" : "Tambah Akun"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={tambahOrtu} className="bg-cream-dark/30 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-sm font-semibold text-ink">Buat akun login orang tua baru</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Nama</label>
              <input className="input-field" required value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Kata Sandi</label>
              <input type="password" className="input-field" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Simpan
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-400 py-4"><Loader2 className="animate-spin" size={16} /> Memuat...</div>
      ) : list.length === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">Belum ada akun orang tua yang ditautkan.</p>
      ) : (
        <ul className="divide-y divide-cream-dark">
          {list.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-ink">{o.nama}</p>
                <p className="text-xs text-stone-500">{o.email}</p>
              </div>
              <button onClick={() => hapus(o.id)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Tambah tab "Orang Tua" di `src/app/(app)/santri/[id]/page.tsx`**

Import `OrtuPanel`:
```tsx
import { OrtuPanel } from "@/components/OrtuPanel";
```

Tambah ke array `tabs` (wrap dengan kondisi role admin — gunakan sesi dari server):

Karena halaman ini `"use client"`, perlu fetch sesi dulu atau baca dari prop. Cara paling simpel: tambah state `isAdmin` yang di-fetch dari `/api/auth/me`.

Tambah di atas fungsi `load()`:
```tsx
const [isAdmin, setIsAdmin] = useState(false);
useEffect(() => {
  fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(d?.user?.role === "admin"));
}, []);
```

Tambah ke array tabs (setelah "pembayaran"):
```tsx
...(isAdmin ? [{ id: "ortu" as Tab, label: "Orang Tua", icon: Users }] : []),
```

Update type `Tab`:
```tsx
type Tab = "profil" | "setoran" | "pembayaran" | "edit" | "ortu";
```

Tambah render di bawah section pembayaran:
```tsx
{tab === "ortu" && <OrtuPanel santriId={params.id} />}
```

Tambah import `Users` dari lucide-react (sudah ada di import yang lain atau tambah).

- [ ] **Step 3: Tambah akun ortu contoh di `src/db/seed.ts`**

Setelah pembuatan santri `Raffasha Dzaki`, tambahkan:
```ts
// Buat akun ortu contoh dan tautkan ke santri
const ortuPass = await bcrypt.hash("ortu123", 10);
const [ortuUser] = await db
  .insert(user)
  .values({
    nama: "Bapak Dzaki",
    email: "ortu@markazquran.id",
    password: ortuPass,
    role: "ortu",
  })
  .onConflictDoNothing({ target: user.email })
  .returning();

if (ortuUser && s) {
  await db
    .insert(santriOrtu)
    .values({ santriId: s.id, userId: ortuUser.id })
    .onConflictDoNothing();
}
```

Tambah import `santriOrtu` di baris import schema.

Update log output:
```ts
console.log("Login ortu   : ortu@markazquran.id / ortu123");
```

- [ ] **Step 4: Verifikasi build dan seed**

```bash
npm run build
npm run db:reset
```

- [ ] **Step 5: Test manual di `npm run dev`**

Checklist:
- [ ] Login sebagai `ortu@markazquran.id` → masuk ke `/portal`
- [ ] Terlihat daftar anak Raffasha Dzaki
- [ ] Klik anak → lihat profil, setoran (read-only), pembayaran (read-only)
- [ ] Login sebagai admin → buka detail santri → tab "Orang Tua" terlihat
- [ ] Tambah akun ortu baru dari panel → akun terbuat dan tertaut
- [ ] Login sebagai `guru@markazquran.id` → tab "Orang Tua" tidak terlihat
- [ ] Ortu coba akses `/dashboard` → redirect ke `/portal`

- [ ] **Step 6: Commit**

```bash
git add src/components/OrtuPanel.tsx src/app/\(app\)/santri/\[id\]/page.tsx src/db/seed.ts
git commit -m "feat: panel kelola akun ortu di halaman admin santri + seed ortu contoh"
```

---

**Selesai.** Push ke remote:
```bash
git push
```
