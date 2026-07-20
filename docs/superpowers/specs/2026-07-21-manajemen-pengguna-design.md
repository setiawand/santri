# Desain: Manajemen Pengguna (Khusus Admin)

Tanggal: 2026-07-21
Status: Disetujui

## Tujuan

Admin dapat menambah dan mengelola akun pengguna (guru maupun admin) langsung dari
aplikasi. Saat ini akun hanya bisa dibuat lewat seed script atau drizzle-kit studio.

## Keputusan Desain

- Cakupan: CRUD lengkap — tambah, edit nama/email/role, reset password, hapus.
- Role bisa dipilih saat membuat/mengedit user: `admin` atau `guru`.
- Penghapusan user yang punya catatan: `createdById` pada `Setoran` dan
  `Pembayaran` di-set NULL dalam satu transaksi, lalu akun dihapus. Riwayat
  setoran/pembayaran tetap utuh.
- Tanpa perubahan skema database.

## API — `src/app/api/users/`

Semua endpoint hanya untuk role `admin`; non-admin mendapat 403 lewat helper baru
`requireAdmin()` di `src/lib/session.ts`. Pengecekan dilakukan di API karena
middleware hanya memvalidasi login, bukan role.

- `GET /api/users` — daftar user: id, nama, email, role, createdAt, plus jumlah
  setoran dan pembayaran yang diinput user tersebut (subquery, mengikuti pola
  `_count` pada daftar santri). Password tidak pernah dikirim.
- `POST /api/users` — body: nama, email, password (min. 6 karakter), role.
  Password di-hash bcrypt (cost 10, sama dengan seed). Email duplikat → 409
  (pola `SQLITE_CONSTRAINT` yang sama dengan NIS santri).
- `PATCH /api/users/[id]` — nama, email, role, password semuanya opsional;
  password hanya di-update bila dikirim (reset password).
- `DELETE /api/users/[id]` — transaksi: NULL-kan `createdById` di kedua tabel,
  lalu hapus baris `User`.

### Proteksi

- Admin tidak bisa menghapus akunnya sendiri.
- Admin tidak bisa menurunkan role dirinya sendiri.
- Admin terakhir tidak bisa dihapus atau diturunkan ke guru — sistem selalu
  punya minimal satu admin. Dicek dengan menghitung admin tersisa.

## UI

- Halaman baru `src/app/(app)/pengguna/page.tsx`. Server component membaca
  session; non-admin di-redirect ke `/dashboard`.
- Komponen client `UserPanel`: tabel user (nama, email, role, jumlah input,
  tanggal dibuat) + tombol "Tambah Pengguna", aksi edit, reset password, dan
  hapus dengan dialog konfirmasi yang menyebut jumlah catatan yang akan
  kehilangan info penginput.
- Item nav "Pengguna" di `Sidebar`, hanya tampil bila `user.role === "admin"`.

## Verifikasi

Tidak ada test suite (konvensi proyek). Verifikasi:

1. `npm run build` — type-check semua route.
2. Terhadap `npm run dev`: login sebagai guru → `GET /api/users` harus 403 dan
   `/pengguna` redirect ke dashboard; login sebagai admin → CRUD lengkap
   berfungsi, hapus diri sendiri ditolak, menurunkan admin terakhir ditolak,
   email duplikat → 409.
