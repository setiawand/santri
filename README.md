# Sistem Santri — Markaz Qur'an Bekasi

Aplikasi web manajemen santri Al-Qur'an untuk **Yayasan Al Husnayain 3 / Markaz Qur'an Bekasi**.
Mendigitalkan tiga formulir: **Pendaftaran Santri**, **Lembar Setoran Tilawah**, dan **Kartu Pembayaran**.

## Teknologi

- **Next.js 14** (App Router) + **TypeScript** — frontend & backend dalam satu codebase
- **Drizzle ORM** + **SQLite** (`better-sqlite3`) — driver sinkron, cepat untuk operasi massal (bulk insert/update)
- **Autentikasi** JWT (cookie httpOnly) + bcrypt, dengan peran **admin** / **guru** / **orang tua**
- **Tailwind CSS**

## Fitur

| Modul | Fungsi |
|-------|--------|
| Pendaftaran Santri | CRUD data santri lengkap (data diri, orang tua, program belajar) + pencarian |
| Setoran Tilawah | Catatan setoran per santri (jilid/halaman, surat/ayat, keterangan, paraf guru & orang tua) |
| Pembayaran | Kartu iuran per tahun ajaran (12 bulan Juli–Juni), iuran + infaq, status lunas, total otomatis |
| Dashboard | Statistik santri, setoran bulan ini, dan pemasukan |
| Pembimbing | Setiap santri punya guru pembimbing sendiri |
| Portal Orang Tua | Orang tua login untuk melihat setoran & pembayaran anaknya, dan membubuhkan paraf ortu |
| Laporan | Pembayaran per santri, rekap pembayaran per bulan, dan daftar santri aktif — siap cetak |

> **Buku panduan pengguna** (PDF, lengkap dengan tangkapan layar): [`docs/panduan-pengguna.pdf`](docs/panduan-pengguna.pdf)
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
| Orang Tua | `ortu@markazquran.id` | `ortu123` |

> Ganti kata sandi & `AUTH_SECRET` sebelum dipakai sungguhan.

## Deploy ke Produksi

Aplikasi memakai **SQLite via `better-sqlite3`**, yang butuh filesystem permanen — jalankan di **server Node biasa / VPS** (mis. Railway, Fly.io, Render, atau VPS sendiri), **bukan** di platform serverless seperti Vercel (filesystem tidak persisten).

1. Set `AUTH_SECRET` ke string acak yang panjang di `.env`.
2. Set `DATABASE_URL` ke path file SQLite (mis. `file:/data/sistem-santri.db` pada volume permanen).
3. Jalankan `npm run db:push` lalu `npm run db:seed`.
4. `npm run build` lalu `npm run start`.
5. Backup cukup dengan menyalin file `.db` secara berkala.

## Deploy Otomatis dari GitHub (CI/CD)

Setiap push ke branch `main` otomatis di-deploy ke server lewat GitHub Actions
(`.github/workflows/deploy.yml`): image Docker dibangun di GitHub, didorong ke
**GitHub Container Registry (GHCR)**, lalu server tinggal `docker pull` + restart —
server tidak pernah mem-build sendiri.

### Persiapan server (sekali saja)

```bash
# 1. Pastikan Docker (dengan plugin compose) terpasang
curl -fsSL https://get.docker.com | sh

# 2. Buat folder aplikasi + file .env
sudo mkdir -p /opt/santri && cd /opt/santri
cat > .env <<'ENV'
AUTH_SECRET=ganti-dengan-string-acak-yang-panjang
APP_PORT=3000
ENV
```

Buat pula sepasang kunci SSH khusus deploy, lalu daftarkan public key-nya ke
`~/.ssh/authorized_keys` user server:

```bash
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-actions-deploy"
cat deploy_key.pub >> ~/.ssh/authorized_keys
```

### Persiapan repo GitHub (sekali saja)

Di **Settings → Secrets and variables → Actions**, tambahkan:

| Secret | Isi |
|--------|-----|
| `SSH_HOST` | IP / domain server |
| `SSH_USER` | user SSH (harus bisa menjalankan `docker`) |
| `SSH_KEY`  | isi lengkap file *private key* `deploy_key` |
| `SSH_PORT` | (opsional) port SSH selain 22 |
| `APP_DIR`  | (opsional) folder aplikasi selain `/opt/santri` |

### Cara pakai

- **Deploy otomatis** — merge/push ke `main`.
- **Deploy manual** — tab *Actions* → workflow *Deploy* → *Run workflow*.
- **Rollback** — buka *Actions*, pilih run lama yang sukses → *Re-run all jobs*;
  atau di server: `IMAGE_TAG=sha-xxxxxxx docker compose -f docker-compose.prod.yml up -d`.

Workflow memverifikasi deploy dengan menunggu halaman login merespons; jika gagal,
log kontainer ditampilkan dan run ditandai merah. Data SQLite aman karena tersimpan
di volume `santri_data`, terpisah dari image. Jika server bukan x86_64 (mis. ARM),
ubah `platforms` pada langkah build di `.github/workflows/deploy.yml`.

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
