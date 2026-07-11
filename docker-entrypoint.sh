#!/bin/sh
set -e

# Ambil path file SQLite dari DATABASE_URL (hapus prefix "file:")
DB_FILE=$(echo "${DATABASE_URL:-file:/app/data/prod.db}" | sed 's|^file:||')

if [ ! -f "$DB_FILE" ]; then
  echo "[entrypoint] Database belum ada di $DB_FILE, menginisialisasi..."
  npx drizzle-kit push
  npx tsx src/db/seed.ts
  echo "[entrypoint] Database siap. Segera ganti password default admin/guru setelah login pertama."
else
  echo "[entrypoint] Database ditemukan: $DB_FILE, menyinkronkan skema..."
  # Terapkan perubahan skema aditif (kolom/tabel baru) ke database yang sudah ada.
  npx drizzle-kit push
fi

exec npx next start
