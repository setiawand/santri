export const BULAN_AJARAN = [
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
] as const;

export function formatRupiah(n: number): string {
  if (!n) return "-";
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

/** Format angka dengan pemisah ribuan gaya Indonesia, contoh 1500000 -> "1.500.000". */
export function formatRibuan(n: number | null | undefined): string {
  if (!n) return "";
  return new Intl.NumberFormat("id-ID").format(n);
}

/** Kebalikan formatRibuan: ambil digit dari input pengguna, contoh "1.500.000" -> 1500000. */
export function parseRibuan(s: string): number {
  const digits = s.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function formatTanggal(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatTanggalSingkat(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Tahun ajaran berjalan, contoh "2025/2026" (mulai Juli). */
export function tahunAjaranSekarang(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0=Jan
  return m >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}
