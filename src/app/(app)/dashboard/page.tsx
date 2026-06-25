"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatRupiah, formatTanggalSingkat } from "@/lib/utils";
import {
  Users,
  UserCheck,
  BookOpenCheck,
  Wallet,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface Stats {
  periode: string;
  bulanIni: string;
  totalSantri: number;
  santriAktif: number;
  setoranBulanIni: number;
  pembayaranLunas: number;
  pemasukan: number;
  setoranTerbaru: { id: string; tanggal: string; surat: string | null; santri: { nama: string; id: string } }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400">
        <Loader2 className="animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  const cards = [
    { label: "Total Santri", value: stats.totalSantri, icon: Users, color: "#0e5c43" },
    { label: "Santri Aktif", value: stats.santriAktif, icon: UserCheck, color: "#2563a8" },
    { label: `Setoran Bln ${stats.bulanIni}`, value: stats.setoranBulanIni, icon: BookOpenCheck, color: "#b8893f" },
    { label: "Pemasukan T.A.", value: formatRupiah(stats.pemasukan), icon: Wallet, color: "#1f8a5b", small: true },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <p className="text-sm text-gold-dark font-semibold tracking-wide uppercase">
          Tahun Ajaran {stats.periode}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-ink mt-1">Dashboard</h1>
        <p className="text-stone-500 mt-1">Ringkasan administrasi santri Markaz Qur'an Bekasi.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: c.color + "1a", color: c.color }}
              >
                <Icon size={20} />
              </div>
              <p className={`font-bold text-ink ${c.small ? "text-lg" : "text-3xl"}`}>{c.value}</p>
              <p className="text-xs text-stone-500 mt-1">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-ink">Setoran Tilawah Terbaru</h2>
            <Link href="/santri" className="text-sm text-emerald font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Lihat santri <ArrowRight size={15} />
            </Link>
          </div>
          {stats.setoranTerbaru.length === 0 ? (
            <p className="text-stone-400 text-sm py-8 text-center">Belum ada catatan setoran.</p>
          ) : (
            <ul className="divide-y divide-cream-dark">
              {stats.setoranTerbaru.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link href={`/santri/${s.santri.id}`} className="font-medium text-ink hover:text-emerald">
                      {s.santri.nama}
                    </Link>
                    <p className="text-xs text-stone-500">{s.surat || "Tilawah"}</p>
                  </div>
                  <span className="text-xs text-stone-400">{formatTanggalSingkat(s.tanggal)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6 bg-arabesque text-cream flex flex-col justify-between">
          <div>
            <Wallet className="text-gold-light mb-3" size={28} />
            <h2 className="font-serif text-xl text-white">Pembayaran Bulan {stats.bulanIni}</h2>
            <p className="text-cream-dark/70 text-sm mt-2">
              {stats.pembayaranLunas} dari {stats.totalSantri} santri sudah terverifikasi lunas.
            </p>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full"
                style={{
                  width: `${stats.totalSantri ? (stats.pembayaranLunas / stats.totalSantri) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
