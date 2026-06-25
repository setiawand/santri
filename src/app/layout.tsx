import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Amiri } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Amiri({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistem Santri — Markaz Qur'an Bekasi",
  description: "Sistem manajemen santri: pendaftaran, setoran tilawah, dan pembayaran.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
