// Skema database Sistem Santri Markaz Qur'an (Drizzle ORM + SQLite).
// Nama tabel & kolom sengaja dibuat sama persis dengan skema Prisma sebelumnya.
import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const user = sqliteTable("User", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("guru"), // "admin" | "guru"
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const santri = sqliteTable("Santri", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nama: text("nama").notNull(),
  nis: text("nis").unique(),
  tempatLahir: text("tempatLahir"),
  tanggalLahir: integer("tanggalLahir", { mode: "timestamp" }),
  pendidikan: text("pendidikan"),
  alamat: text("alamat"),
  kelas: text("kelas"),
  // Data orang tua
  namaAyah: text("namaAyah"),
  hpAyah: text("hpAyah"),
  pekerjaanAyah: text("pekerjaanAyah"),
  namaIbu: text("namaIbu"),
  hpIbu: text("hpIbu"),
  pekerjaanIbu: text("pekerjaanIbu"),
  // Program
  programBelajar: text("programBelajar"),
  waktuBelajar: text("waktuBelajar"),
  status: text("status").notNull().default("aktif"), // "aktif" | "nonaktif"
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const setoran = sqliteTable(
  "Setoran",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    santriId: text("santriId")
      .notNull()
      .references(() => santri.id, { onDelete: "cascade" }),
    tanggal: integer("tanggal", { mode: "timestamp" }).notNull(),
    periode: text("periode"), // contoh: "2025/2026 Ganjil"
    jilid: text("jilid"),
    halaman: text("halaman"),
    surat: text("surat"),
    ayat: text("ayat"),
    keterangan: text("keterangan"),
    parafGuru: integer("parafGuru", { mode: "boolean" }).notNull().default(false),
    parafOrtu: integer("parafOrtu", { mode: "boolean" }).notNull().default(false),
    createdById: text("createdById").references(() => user.id),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    santriIdx: index("Setoran_santriId_idx").on(t.santriId),
  })
);

export const pembayaran = sqliteTable(
  "Pembayaran",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    santriId: text("santriId")
      .notNull()
      .references(() => santri.id, { onDelete: "cascade" }),
    periode: text("periode").notNull(), // tahun ajaran, contoh: "2025/2026"
    bulan: text("bulan").notNull(), // "Juli" .. "Juni"
    tanggal: integer("tanggal", { mode: "timestamp" }),
    iuran: integer("iuran").notNull().default(0),
    infaq: integer("infaq").notNull().default(0),
    paraf: integer("paraf", { mode: "boolean" }).notNull().default(false),
    createdById: text("createdById").references(() => user.id),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    santriIdx: index("Pembayaran_santriId_idx").on(t.santriId),
    uniqByBulan: uniqueIndex("Pembayaran_santriId_periode_bulan_key").on(
      t.santriId,
      t.periode,
      t.bulan
    ),
  })
);

// Relasi untuk query relasional (db.query.*.findMany({ with: ... })).
export const userRelations = relations(user, ({ many }) => ({
  setoran: many(setoran),
  pembayaran: many(pembayaran),
}));

export const santriRelations = relations(santri, ({ many }) => ({
  setoran: many(setoran),
  pembayaran: many(pembayaran),
}));

export const setoranRelations = relations(setoran, ({ one }) => ({
  santri: one(santri, { fields: [setoran.santriId], references: [santri.id] }),
  createdBy: one(user, { fields: [setoran.createdById], references: [user.id] }),
}));

export const pembayaranRelations = relations(pembayaran, ({ one }) => ({
  santri: one(santri, { fields: [pembayaran.santriId], references: [santri.id] }),
  createdBy: one(user, { fields: [pembayaran.createdById], references: [user.id] }),
}));
