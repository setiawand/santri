export const BULAN_AJARAN = [
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
] as const;

export function formatRupiah(n: number): string {
  if (!n) return "-";
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
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
