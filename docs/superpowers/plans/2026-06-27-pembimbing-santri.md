# Pembimbing Santri — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setiap santri dapat ditautkan ke seorang guru/pembimbing. Admin bisa memilih pembimbing saat buat/edit data santri. Nama pembimbing tampil di profil santri.

**Architecture:** Tambah kolom `pembimbingId` (nullable FK ke `User`) di tabel `Santri`. API santri diperluas untuk menerima dan mengembalikan field ini. `SantriForm` mendapat dropdown pembimbing yang di-fetch dari endpoint baru `/api/users`. Tampilkan nama pembimbing di tab Profil.

**Tech Stack:** Drizzle ORM, Next.js App Router, React.

## Global Constraints

- `npm run build` harus lulus tanpa error setelah setiap task.
- Tidak ada dependency baru.
- `pembimbingId` nullable — santri boleh tidak punya pembimbing.
- Dropdown pembimbing hanya menampilkan user dengan role `admin` atau `guru` (bukan `ortu`).
- `npm run db:push` diperlukan setelah perubahan schema.

---

## File Map

| File | Status | Tanggung jawab |
|------|--------|----------------|
| `src/db/schema.ts` | Modify | Tambah kolom `pembimbingId` di tabel `Santri` |
| `src/app/api/users/route.ts` | Create | GET daftar user (untuk dropdown — admin & guru only) |
| `src/app/api/santri/route.ts` | Modify | Terima `pembimbingId` di POST, sertakan nama pembimbing di response |
| `src/app/api/santri/[id]/route.ts` | Modify | Terima `pembimbingId` di PATCH, sertakan nama pembimbing di GET |
| `src/components/SantriForm.tsx` | Modify | Tambah dropdown Pembimbing |
| `src/app/(app)/santri/[id]/page.tsx` | Modify | Tampilkan nama pembimbing di Profil |

---

### Task 1: Tambah kolom pembimbingId ke schema Santri

**Files:**
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `santri.pembimbingId` nullable FK ke `user.id`

- [ ] **Step 1: Edit `src/db/schema.ts` — tambah kolom di tabel `santri`**

Di dalam `sqliteTable("Santri", { ... })`, tambahkan kolom baru setelah `status`:
```ts
pembimbingId: text("pembimbingId").references(() => user.id, { onDelete: "set null" }),
```

Tambahkan ke `santriRelations`:
```ts
export const santriRelations = relations(santri, ({ many, one }) => ({
  setoran: many(setoran),
  pembayaran: many(pembayaran),
  santriOrtu: many(santriOrtu),           // ada jika plan ortu sudah diimplementasikan
  pembimbing: one(user, { fields: [santri.pembimbingId], references: [user.id] }),
}));
```

Jika plan login-orang-tua belum diimplementasikan (tidak ada `santriOrtu`), cukup:
```ts
export const santriRelations = relations(santri, ({ many, one }) => ({
  setoran: many(setoran),
  pembayaran: many(pembayaran),
  pembimbing: one(user, { fields: [santri.pembimbingId], references: [user.id] }),
}));
```

- [ ] **Step 2: Push schema**

```bash
npm run db:push
```

Expected: kolom `pembimbingId` ditambah ke tabel `Santri`.

- [ ] **Step 3: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: tambah kolom pembimbingId ke tabel Santri"
```

---

### Task 2: API GET /api/users — daftar user untuk dropdown

**Files:**
- Create: `src/app/api/users/route.ts`

**Interfaces:**
- Produces: `GET /api/users?role=guru` → `{ users: Array<{id, nama, email, role}> }`
- Hanya bisa diakses oleh sesi yang sudah login (semua role kecuali ortu).

- [ ] **Step 1: Buat `src/app/api/users/route.ts`**

```ts
import { NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role === "ortu") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");

  const rows = await db
    .select({ id: user.id, nama: user.nama, email: user.email, role: user.role })
    .from(user)
    .where(roleFilter ? eq(user.role, roleFilter) : ne(user.role, "ortu"));

  return NextResponse.json({ users: rows });
}
```

- [ ] **Step 2: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/users/
git commit -m "feat: API GET /api/users untuk dropdown pembimbing"
```

---

### Task 3: Update API santri — terima dan kembalikan pembimbingId

**Files:**
- Modify: `src/app/api/santri/route.ts`
- Modify: `src/app/api/santri/[id]/route.ts`

**Interfaces:**
- Produces:
  - `GET /api/santri` — setiap item santri memiliki field `pembimbing: {id, nama} | null`
  - `POST /api/santri` — terima `pembimbingId` opsional di body
  - `GET /api/santri/[id]` — response memiliki field `pembimbing: {id, nama} | null`
  - `PATCH /api/santri/[id]` — terima `pembimbingId` opsional di body

- [ ] **Step 1: Baca `src/app/api/santri/route.ts`** untuk memahami struktur query GET dan POST saat ini.

- [ ] **Step 2: Edit POST di `src/app/api/santri/route.ts` — tambah pembimbingId**

Di blok `.values({ ... })` pada INSERT, tambahkan:
```ts
pembimbingId: b.pembimbingId ? String(b.pembimbingId) : null,
```

- [ ] **Step 3: Edit GET di `src/app/api/santri/route.ts` — sertakan nama pembimbing**

Ganti query `.select({ ...getTableColumns(santri), ... })` dengan join ke user:

```ts
import { asc, like, or, sql, getTableColumns, eq, leftJoin } from "drizzle-orm";
import { user } from "@/db/schema";

// Ganti query di GET:
const rows = await db
  .select({
    ...getTableColumns(santri),
    setoranCount: sql<number>`(select count(*) from "Setoran" where "Setoran"."santriId" = "Santri"."id")`,
    pembayaranCount: sql<number>`(select count(*) from "Pembayaran" where "Pembayaran"."santriId" = "Santri"."id")`,
    pembimbingNama: user.nama,
  })
  .from(santri)
  .leftJoin(user, eq(santri.pembimbingId, user.id))
  .where(
    q
      ? or(like(santri.nama, `%${q}%`), like(santri.nis, `%${q}%`), like(santri.kelas, `%${q}%`))
      : undefined
  )
  .orderBy(asc(santri.nama));

const result = rows.map(({ setoranCount, pembayaranCount, pembimbingNama, ...s }) => ({
  ...s,
  _count: { setoran: setoranCount, pembayaran: pembayaranCount },
  pembimbing: s.pembimbingId ? { id: s.pembimbingId, nama: pembimbingNama } : null,
}));
```

- [ ] **Step 4: Baca `src/app/api/santri/[id]/route.ts`** untuk memahami struktur GET dan PATCH saat ini.

- [ ] **Step 5: Edit GET di `src/app/api/santri/[id]/route.ts` — sertakan pembimbing**

Ubah query findFirst menjadi join query:
```ts
import { eq } from "drizzle-orm";
import { santri, user } from "@/db/schema";

// Dalam fungsi GET:
const [row] = await db
  .select({
    ...getTableColumns(santri),
    pembimbingNama: user.nama,
  })
  .from(santri)
  .leftJoin(user, eq(santri.pembimbingId, user.id))
  .where(eq(santri.id, params.id))
  .limit(1);

if (!row) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

const { pembimbingNama, ...santriData } = row;
return NextResponse.json({
  santri: {
    ...santriData,
    pembimbing: santriData.pembimbingId ? { id: santriData.pembimbingId, nama: pembimbingNama } : null,
  },
});
```

Tambahkan `getTableColumns` ke import drizzle-orm jika belum ada.

- [ ] **Step 6: Edit PATCH di `src/app/api/santri/[id]/route.ts` — terima pembimbingId**

Di blok `.set({ ... })` pada UPDATE, tambahkan:
```ts
pembimbingId: "pembimbingId" in b ? (b.pembimbingId || null) : undefined,
```

- [ ] **Step 7: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/app/api/santri/
git commit -m "feat: API santri menerima dan mengembalikan data pembimbing"
```

---

### Task 4: Tambah dropdown Pembimbing di SantriForm

**Files:**
- Modify: `src/components/SantriForm.tsx`

**Interfaces:**
- Consumes: `GET /api/users?role=guru` dan `GET /api/users?role=admin`
- Produces: `SantriForm` menampilkan dropdown "Pembimbing" yang terisi nama guru/admin; nilai tersimpan sebagai `pembimbingId`

- [ ] **Step 1: Baca `src/components/SantriForm.tsx`** untuk memahami struktur state, type `SantriData`, dan form fields.

- [ ] **Step 2: Tambah `pembimbingId` ke type `SantriData`**

Di interface/type `SantriData`, tambahkan:
```ts
pembimbingId?: string | null;
pembimbing?: { id: string; nama: string } | null;
```

- [ ] **Step 3: Tambah state dan fetch daftar guru di SantriForm**

```tsx
const [guruList, setGuruList] = useState<{ id: string; nama: string; role: string }[]>([]);

useEffect(() => {
  fetch("/api/users")
    .then((r) => r.json())
    .then((d) => setGuruList(d.users || []));
}, []);
```

- [ ] **Step 4: Tambah field pembimbing di form**

Letakkan setelah field `waktuBelajar` (bagian Program Belajar):
```tsx
<div>
  <label className="label">Pembimbing</label>
  <select
    className="input-field"
    value={form.pembimbingId || ""}
    onChange={(e) => setForm((f) => ({ ...f, pembimbingId: e.target.value || null }))}
  >
    <option value="">— Belum ditentukan —</option>
    {guruList.map((g) => (
      <option key={g.id} value={g.id}>
        {g.nama} ({g.role})
      </option>
    ))}
  </select>
</div>
```

- [ ] **Step 5: Pastikan pembimbingId ikut terkirim di submit**

Di fungsi submit/save, pastikan `pembimbingId` ada di body yang dikirim ke API. Jika menggunakan spread `{ ...form }`, sudah otomatis ikut.

- [ ] **Step 6: Inisialisasi state dari `initial` prop**

Di inisialisasi state form dari prop `initial`, pastikan:
```ts
pembimbingId: initial?.pembimbingId ?? null,
```

- [ ] **Step 7: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/components/SantriForm.tsx
git commit -m "feat: dropdown pembimbing di form tambah/edit santri"
```

---

### Task 5: Tampilkan pembimbing di Profil santri

**Files:**
- Modify: `src/app/(app)/santri/[id]/page.tsx`

**Interfaces:**
- Consumes: `santri.pembimbing` dari `GET /api/santri/[id]`
- Produces: baris "Pembimbing" di card "Data Santri" pada tab Profil

- [ ] **Step 1: Pastikan type `SantriData` di page ini sudah include `pembimbing`**

Di `src/app/(app)/santri/[id]/page.tsx`, type `SantriData` di-import dari `SantriForm`. Pastikan field `pembimbing?: { id: string; nama: string } | null` sudah ada (dari Task 4).

- [ ] **Step 2: Tambah baris pembimbing di komponen `Profil`**

Di bagian card "Data Santri", tambahkan setelah baris `waktuBelajar`:
```tsx
<Row label="Pembimbing" value={santri.pembimbing?.nama} />
```

- [ ] **Step 3: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 4: Test manual di `npm run dev`**

Checklist:
- [ ] Buka form tambah santri → dropdown Pembimbing terisi daftar guru/admin
- [ ] Pilih pembimbing → simpan → buka profil → nama pembimbing tampil
- [ ] Buka form edit → dropdown terisi pembimbing yang sudah dipilih sebelumnya
- [ ] Kosongkan pembimbing → simpan → profil menampilkan "-"
- [ ] Daftar santri (`/santri`) tidak error

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/santri/\[id\]/page.tsx
git commit -m "feat: tampilkan nama pembimbing di profil santri"
```

---

**Selesai.** Push ke remote:
```bash
git push
```
