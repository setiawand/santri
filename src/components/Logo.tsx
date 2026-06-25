export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo Markaz Qur'an"
    >
      {/* Sayap kiri (hijau) */}
      <path d="M6 20 C 6 18, 8 17, 10 18 L 30 30 L 30 52 L 10 42 C 8 41, 6 39, 6 37 Z" fill="#1f8a5b" />
      {/* Sayap kanan (hijau gelap) */}
      <path d="M58 20 C 58 18, 56 17, 54 18 L 34 30 L 34 52 L 54 42 C 56 41, 58 39, 58 37 Z" fill="#0e5c43" />
      {/* Buku tengah (biru) */}
      <path d="M22 14 L 32 20 L 42 14 L 42 44 L 32 50 L 22 44 Z" fill="#2563a8" />
      <path d="M32 20 L 32 50" stroke="#1b4d86" strokeWidth="1.5" />
      {/* Kepala (titik merah) */}
      <circle cx="32" cy="11" r="6" fill="#d64545" />
    </svg>
  );
}
