"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, X, Wallet } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface Bayar {
  id: string;
  bulan: string;
  tanggal: string | null;
  iuran: number;
  infaq: number;
  paraf: boolean;
}

export function PembayaranPanel({ santriId }: { santriId: string }) {
  const [rows, setRows] = useState<Bayar[]>([]);
  const [periode, setPeriode] = useState<string>("");
  const [periodeList, setPeriodeList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(p?: string) {
    setLoading(true);
    const url = `/api/pembayaran?santriId=${santriId}${p ? `&periode=${encodeURIComponent(p)}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    setRows(data.pembayaran || []);
    setPeriode(data.periode);
    setPeriodeList(data.periodeTersedia || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [santriId]);

  function setLocal(id: string, patch: Partial<Bayar>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function save(id: string, patch: Partial<Bayar>) {
    await fetch(`/api/pembayaran/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  const totalIuran = rows.reduce((a, b) => a + b.iuran, 0);
  const totalInfaq = rows.reduce((a, b) => a + b.infaq, 0);

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-serif text-xl text-ink">Kartu Pembayaran</h3>
        <div className="flex items-center gap-2 no-print">
          <label className="text-sm text-stone-500">Tahun Ajaran:</label>
          <select
            className="input-field py-1.5 w-auto"
            value={periode}
            onChange={(e) => load(e.target.value)}
          >
            {[periode, ...periodeList.filter((p) => p !== periode)].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-stone-400"><Loader2 className="animate-spin mr-2" /> Memuat...</div>
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-cream text-left">
                  <th className="px-3 py-2 font-semibold border border-emerald-800 w-10">No</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800">Bulan</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800">Tgl Bayar</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800">Iuran (Rp)</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800">Infaq (Rp)</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800 text-center">Lunas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b, i) => (
                  <tr key={b.id} className={b.paraf ? "bg-emerald-50/60" : "odd:bg-white even:bg-cream/40"}>
                    <td className="px-3 py-1.5 border border-cream-dark text-stone-500">{i + 1}</td>
                    <td className="px-3 py-1.5 border border-cream-dark font-medium text-ink">{b.bulan}</td>
                    <td className="px-2 py-1 border border-cream-dark">
                      <input
                        type="date"
                        className="input-field py-1 text-xs"
                        value={b.tanggal ? b.tanggal.slice(0, 10) : ""}
                        onChange={(e) => setLocal(b.id, { tanggal: e.target.value })}
                        onBlur={(e) => save(b.id, { tanggal: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1 border border-cream-dark">
                      <input
                        type="number"
                        min={0}
                        className="input-field py-1 text-right"
                        value={b.iuran || ""}
                        onChange={(e) => setLocal(b.id, { iuran: parseInt(e.target.value) || 0 })}
                        onBlur={(e) => save(b.id, { iuran: parseInt(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-2 py-1 border border-cream-dark">
                      <input
                        type="number"
                        min={0}
                        className="input-field py-1 text-right"
                        value={b.infaq || ""}
                        onChange={(e) => setLocal(b.id, { infaq: parseInt(e.target.value) || 0 })}
                        onBlur={(e) => save(b.id, { infaq: parseInt(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="px-3 py-1.5 border border-cream-dark text-center">
                      <button
                        onClick={() => { const nv = !b.paraf; setLocal(b.id, { paraf: nv }); save(b.id, { paraf: nv }); }}
                        className={`h-6 w-6 rounded-full inline-flex items-center justify-center transition ${
                          b.paraf ? "bg-emerald text-white" : "bg-stone-100 text-stone-300 hover:bg-stone-200"
                        }`}
                      >
                        {b.paraf ? <Check size={14} /> : <X size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-cream-dark/60 font-semibold text-ink">
                  <td className="px-3 py-2 border border-cream-dark" colSpan={3}>Total</td>
                  <td className="px-3 py-2 border border-cream-dark text-right">{formatRupiah(totalIuran)}</td>
                  <td className="px-3 py-2 border border-cream-dark text-right">{formatRupiah(totalInfaq)}</td>
                  <td className="px-3 py-2 border border-cream-dark" />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-stone-400 mt-3 flex items-center gap-1.5">
            <Wallet size={13} /> Perubahan tersimpan otomatis. Total pemasukan tahun ajaran ini:{" "}
            <span className="font-semibold text-emerald">{formatRupiah(totalIuran + totalInfaq)}</span>
          </p>
        </>
      )}
    </div>
  );
}
