# Sistem Santri — Markaz Qur'an Bekasi

Aplikasi web manajemen santri Al-Qur'an untuk **Yayasan Al Husnayain 3 / Markaz Qur'an Bekasi**.
Mendigitalkan tiga formulir: **Pendaftaran Santri**, **Lembar Setoran Tilawah**, dan **Kartu Pembayaran**.

## Teknologi

- **Next.js 14** (App Router) + **TypeScript** — frontend & backend dalam satu codebase
- **Drizzle ORM** + **SQLite** (`better-sqlite3`) — driver sinkron, cepat untuk operasi massal (bulk insert/update)
- **Autentikasi** JWT (cookie httpOnly) + bcrypt, dengan peran **admin** / **guru**
- **Tailwind CSS**

## Fitur

| Modul | Fungsi |
|-------|--------|
| Pendaftaran Santri | CRUD data santri lengkap (data diri, orang tua, program belajar) + pencarian |
| Setoran Tilawah | Catatan setoran per santri (jilid/halaman, surat/ayat, keterangan, paraf guru & orang tua) |
| Pembayaran | Kartu iuran per tahun ajaran (12 bulan Juli–Juni), iuran + infaq, status lunas, total otomatis |
| Dashboard | Statistik santri, setoran bulan ini, dan pemasukan |
| Login multi-user | Banyak akun admin/guru, sesi aman |

## Cara Menjalankan (Lokal)

Butuh **Node.js 18.18+** (disarankan Node 20).

```bash
# 1. Install dependency
npm install

# 2. Siapkan environment (sudah ada .env default untuk SQLite)
cp .env.example .env

# 3. Buat tabel database & isi data awal (admin, guru, contoh santri)
npm run db:push   # buat skema (drizzle-kit push)
npm run db:seed   # isi data awal

# 4. Jalankan
npm run dev
```

> Untuk mereset database dari nol: `npm run db:reset`. Untuk menjelajah data lewat GUI: `npm run db:studio`.

Buka http://localhost:3000

### Akun Demo

| Peran | Email | Kata Sandi |
|-------|-------|-----------|
| Admin | `admin@markazquran.id` | `admin123` |
| Guru  | `guru@markazquran.id`  | `guru123`  |

> Ganti kata sandi & `AUTH_SECRET` sebelum dipakai sungguhan.

## Deploy ke Produksi

Aplikasi memakai **SQLite via `better-sqlite3`**, yang butuh filesystem permanen — jalankan di **server Node biasa / VPS** (mis. Railway, Fly.io, Render, atau VPS sendiri), **bukan** di platform serverless seperti Vercel (filesystem tidak persisten).

1. Set `AUTH_SECRET` ke string acak yang panjang di `.env`.
2. Set `DATABASE_URL` ke path file SQLite (mis. `file:/data/sistem-santri.db` pada volume permanen).
3. Jalankan `npm run db:push` lalu `npm run db:seed`.
4. `npm run build` lalu `npm run start`.
5. Backup cukup dengan menyalin file `.db` secara berkala.

## Struktur Proyek

```
src/
  app/
    login/                 Halaman login
    (app)/                 Area terproteksi (perlu login)
      dashboard/           Dashboard statistik
      santri/              Daftar, tambah, detail santri (tab Profil/Setoran/Pembayaran)
    api/                   Backend: auth, santri, setoran, pembayaran, stats
  components/              Sidebar, Logo, Form, Panel Setoran & Pembayaran
  db/                      schema (Drizzle), index (client db), seed
  lib/                     jwt, password, session, util
  middleware.ts            Proteksi route
drizzle.config.ts          Konfigurasi drizzle-kit
```

## Menambah Akun Pengguna Baru

Cara cepat lewat Drizzle Studio:

```bash
npm run db:studio
```

Atau tambahkan di `src/db/seed.ts` dan jalankan ulang `npm run db:seed`.
Kata sandi harus di-hash bcrypt (lihat contoh di `seed.ts`).
