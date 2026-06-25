import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { user, santri, setoran, pembayaran } from "./schema";

const BULAN = [
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
];

async function main() {
  console.log("Menyiapkan akun pengguna...");
  const adminPass = await bcrypt.hash("admin123", 10);
  const guruPass = await bcrypt.hash("guru123", 10);

  // upsert sederhana: insert, abaikan bila email sudah ada.
  await db
    .insert(user)
    .values({
      nama: "Administrator",
      email: "admin@markazquran.id",
      password: adminPass,
      role: "admin",
    })
    .onConflictDoNothing({ target: user.email });

  await db
    .insert(user)
    .values({
      nama: "Ustadz Pengajar",
      email: "guru@markazquran.id",
      password: guruPass,
      role: "guru",
    })
    .onConflictDoNothing({ target: user.email });

  console.log("Menambahkan contoh santri...");
  const existing = await db.query.santri.findFirst({
    where: eq(santri.nama, "Raffasha Dzaki"),
  });

  if (!existing) {
    const [s] = await db
      .insert(santri)
      .values({
        nama: "Raffasha Dzaki",
        nis: "2025001",
        tempatLahir: "Bekasi",
        tanggalLahir: new Date("2015-04-12"),
        pendidikan: "SD",
        alamat: "Perum. Mas Naga Bintara Jaya, Bekasi Barat",
        kelas: "Tahsin 1",
        namaAyah: "Bapak Dzaki",
        hpAyah: "08123456789",
        pekerjaanAyah: "Wiraswasta",
        namaIbu: "Ibu Dzaki",
        hpIbu: "08129876543",
        pekerjaanIbu: "Ibu Rumah Tangga",
        programBelajar: "Tahsin & Tilawah",
        waktuBelajar: "Sore (16.00 - 17.30)",
      })
      .returning();

    await db.insert(setoran).values({
      santriId: s.id,
      tanggal: new Date(),
      periode: "2025/2026 Ganjil",
      jilid: "Jilid 1",
      halaman: "12",
      surat: "Al-Fatihah",
      ayat: "1-7",
      keterangan: "Lancar, makhraj baik",
      parafGuru: true,
    });

    // Bulk insert 12 bulan sekaligus dalam satu statement.
    await db.insert(pembayaran).values(
      BULAN.map((bulan) => ({
        santriId: s.id,
        periode: "2025/2026",
        bulan,
        iuran: bulan === "Juli" ? 150000 : 0,
        infaq: bulan === "Juli" ? 20000 : 0,
        paraf: bulan === "Juli",
        tanggal: bulan === "Juli" ? new Date() : null,
      }))
    );
  }

  console.log("Seed selesai.");
  console.log("Login admin : admin@markazquran.id / admin123");
  console.log("Login guru  : guru@markazquran.id / guru123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
