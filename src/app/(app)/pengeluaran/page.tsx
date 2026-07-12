"use client";

// Pencatatan pengeluaran operasional bulanan (khusus staf).
// Ikut tampil di laporan Rekap per Bulan sebagai pengurang saldo.
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Check, ReceiptText } from "lucide-react";
import { formatRibuan, parseRibuan, formatRupiah, formatTanggalSingkat } from "@/lib/utils";

interface Pengeluaran {
  id: string;
  tanggal: string;
  kategori: string | null;
  keterangan: string;
  nominal: number;
}
interface Meta { periodeList: string[]; bulanList: string[] }

const KATEGORI_SARAN = [
  "Listrik & Air", "Honor Pengajar", "ATK & Perlengkapan", "Konsumsi", "Sewa", "Perawatan", "Lainnya",
];

const emptyForm = {
  tanggal: new Date().toISOString().slice(0, 10),
  kategori: "",
  keterangan: "",
  nominal: 0,
};

export default function PengeluaranPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [periode, setPeriode] = useState("");
  const [bulan, setBulan] = useState("");
  const [rows, setRows] = useState<Pengeluaran[]>([]);
  const [total, setTotal] = useState(0);
  const [tahun, setTahun] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/laporan?jenis=meta")
      .then((r) => r.json())
      .then((m: Meta) => {
        setMeta(m);
        setPeriode(m.periodeList[0]);
        // Bulan berjalan sebagai bawaan.
        const now = new Date().toLocaleDateString("id-ID", { month: "long" });
        setBulan(m.bulanList.includes(now) ? now : m.bulanList[0]);
      })
      .catch(() => {});
  }, []);

  async function load(p = periode, b = bulan) {
    if (!p || !b) return;
    setLoading(true);
    const res = await fetch(`/api/pengeluaran?periode=${encodeURIComponent(p)}&bulan=${encodeURIComponent(b)}`);
    const data = await res.json();
    setRows(data.pengeluaran || []);
    setTotal(data.total || 0);
    setTahun(data.tahun ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); }, [periode, bulan]);

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.keterangan.trim()) { setError("Keterangan wajib diisi"); return; }
    setSaving(true);
    const res = await fetch("/api/pengeluaran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Gagal menyimpan");
      return;
    }
    setForm({ ...emptyForm, tanggal: form.tanggal });
    setShowForm(false);
    load();
  }

  async function hapus(id: string) {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    await fetch(`/api/pengeluaran/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-5 sm:p-8 max-w-4xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="font-serif text-3xl text-ink">Pengeluaran</h1>
          <p className="text-stone-500">Catat biaya operasional bulanan (listrik, honor, ATK, dll.).</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={18} /> Catat Pengeluaran
        </button>
      </header>

      {showForm && (
        <form onSubmit={tambah} className="bg-cream/70 border border-cream-dark rounded-xl p-4 mb-5 grid sm:grid-cols-2 gap-3 no-print">
          {error && (
            <div className="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="label">Tanggal *</label>
            <input type="date" className="input-field" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
          </div>
          <div>
            <label className="label">Kategori</label>
            <input className="input-field" list="kategori-saran" placeholder="contoh: Listrik & Air" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} />
            <datalist id="kategori-saran">
              {KATEGORI_SARAN.map((k) => <option key={k} value={k} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Keterangan *</label>
            <input className="input-field" placeholder="contoh: Tagihan listrik bulan Juli" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
          </div>
          <div>
            <label className="label">Nominal (Rp) *</label>
            <input
              type="text"
              inputMode="numeric"
              className="input-field text-right"
              placeholder="0"
              value={formatRibuan(form.nominal)}
              onChange={(e) => setForm({ ...form, nominal: parseRibuan(e.target.value) })}
            />
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Simpan
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-4 no-print">
        <div>
          <label className="label">Tahun Ajaran</label>
          <select className="input-field w-auto" value={periode} onChange={(e) => setPeriode(e.target.value)}>
            {(meta?.periodeList || []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Bulan</label>
          <select className="input-field w-auto" value={bulan} onChange={(e) => setBulan(e.target.value)}>
            {(meta?.bulanList || []).map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h3 className="font-serif text-xl text-ink mb-4">
          Pengeluaran {bulan} {tahun ?? ""}
        </h3>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-stone-400"><Loader2 className="animate-spin mr-2" /> Memuat...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-stone-400">
            <ReceiptText size={36} className="mx-auto mb-2 text-stone-300" />
            Belum ada pengeluaran tercatat pada bulan ini.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-cream text-left">
                  <th className="px-3 py-2 font-semibold border border-emerald-800 w-10">No.</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800">Tanggal</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800">Kategori</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800">Keterangan</th>
                  <th className="px-3 py-2 font-semibold border border-emerald-800 text-right">Nominal (Rp)</th>
                  <th className="px-3 py-2 border border-emerald-800 no-print" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="odd:bg-white even:bg-cream/40">
                    <td className="px-3 py-2 border border-cream-dark text-stone-500">{i + 1}</td>
                    <td className="px-3 py-2 border border-cream-dark whitespace-nowrap">{formatTanggalSingkat(r.tanggal)}</td>
                    <td className="px-3 py-2 border border-cream-dark">{r.kategori || "-"}</td>
                    <td className="px-3 py-2 border border-cream-dark">{r.keterangan}</td>
                    <td className="px-3 py-2 border border-cream-dark text-right">{formatRibuan(r.nominal) || "-"}</td>
                    <td className="px-3 py-2 border border-cream-dark text-center no-print">
                      <button onClick={() => hapus(r.id)} className="text-stone-300 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-cream-dark/60 font-semibold text-ink">
                  <td className="px-3 py-2 border border-cream-dark" colSpan={4}>Total</td>
                  <td className="px-3 py-2 border border-cream-dark text-right">{formatRupiah(total)}</td>
                  <td className="px-3 py-2 border border-cream-dark no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="text-xs text-stone-400 mt-3">
          Pengeluaran ikut dihitung pada laporan <strong>Rekap per Bulan</strong> (pemasukan − pengeluaran = saldo).
        </p>
      </div>
    </div>
  );
}
