"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, Loader2, ChevronRight } from "lucide-react";

interface SantriRow {
  id: string;
  nama: string;
  nis: string | null;
  kelas: string | null;
  status: string;
  programBelajar: string | null;
  _count: { setoran: number; pembayaran: number };
}

export default function SantriListPage() {
  const [santri, setSantri] = useState<SantriRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(query = "") {
    setLoading(true);
    const res = await fetch(`/api/santri?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setSantri(data.santri || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">Data Santri</h1>
          <p className="text-stone-500">{santri.length} santri terdaftar.</p>
        </div>
        <Link href="/santri/baru" className="btn btn-primary">
          <Plus size={18} /> Daftarkan Santri
        </Link>
      </header>

      <div className="relative mb-5 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          className="input-field pl-10"
          placeholder="Cari nama, NIS, atau kelas..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-stone-400">
          <Loader2 className="animate-spin mr-2" /> Memuat...
        </div>
      ) : santri.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500">Belum ada santri. Mulai dengan mendaftarkan santri baru.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-dark/60 text-left text-stone-600">
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">NIS</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">Program</th>
                  <th className="px-4 py-3 font-semibold text-center">Setoran</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {santri.map((s) => (
                  <tr key={s.id} className="hover:bg-cream/60 transition">
                    <td className="px-4 py-3 font-medium text-ink">
                      <Link href={`/santri/${s.id}`} className="hover:text-emerald">
                        {s.nama}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{s.nis || "-"}</td>
                    <td className="px-4 py-3 text-stone-500">{s.kelas || "-"}</td>
                    <td className="px-4 py-3 text-stone-500">{s.programBelajar || "-"}</td>
                    <td className="px-4 py-3 text-center text-stone-500">{s._count.setoran}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.status === "aktif"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {s.status === "aktif" ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/santri/${s.id}`} className="text-stone-400 hover:text-emerald inline-flex">
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
