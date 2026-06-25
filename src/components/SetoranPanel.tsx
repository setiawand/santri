"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Check, X, BookOpen } from "lucide-react";
import { formatTanggalSingkat } from "@/lib/utils";

interface Setoran {
  id: string;
  tanggal: string;
  jilid: string | null;
  halaman: string | null;
  surat: string | null;
  ayat: string | null;
  keterangan: string | null;
  parafGuru: boolean;
  parafOrtu: boolean;
}

const empty = {
  tanggal: new Date().toISOString().slice(0, 10),
  jilid: "",
  halaman: "",
  surat: "",
  ayat: "",
  keterangan: "",
};

export function SetoranPanel({ santriId }: { santriId: string }) {
  const [list, setList] = useState<Setoran[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/setoran?santriId=${santriId}`);
    const data = await res.json();
    setList(data.setoran || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [santriId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/setoran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ santriId, ...form }),
    });
    setForm(empty);
    setShowForm(false);
    setSaving(false);
    load();
  }

  async function toggleParaf(s: Setoran, field: "parafGuru" | "parafOrtu") {
    setList((l) => l.map((x) => (x.id === s.id ? { ...x, [field]: !x[field] } : x)));
    await fetch(`/api/setoran/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !s[field] }),
    });
  }

  async function hapus(id: string) {
    if (!confirm("Hapus catatan setoran ini?")) return;
    await fetch(`/api/setoran/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 no-print">
        <h3 className="font-serif text-xl text-ink">Lembar Setoran Tilawah</h3>
        <button className="btn btn-gold" onClick={() => setShowForm((v) => !v)}>
          <Plus size={18} /> Tambah Setoran
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="bg-cream/70 border border-cream-dark rounded-xl p-4 mb-5 grid sm:grid-cols-3 gap-3 no-print">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" className="input-field" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
          </div>
          <div>
            <label className="label">Jilid</label>
            <input className="input-field" placeholder="Jilid 1" value={form.jilid} onChange={(e) => setForm({ ...form, jilid: e.target.value })} />
          </div>
          <div>
            <label className="label">Halaman</label>
            <input className="input-field" placeholder="12" value={form.halaman} onChange={(e) => setForm({ ...form, halaman: e.target.value })} />
          </div>
          <div>
            <label className="label">Surat</label>
            <input className="input-field" placeholder="Al-Baqarah" value={form.surat} onChange={(e) => setForm({ ...form, surat: e.target.value })} />
          </div>
          <div>
            <label className="label">Ayat</label>
            <input className="input-field" placeholder="1-10" value={form.ayat} onChange={(e) => setForm({ ...form, ayat: e.target.value })} />
          </div>
          <div>
            <label className="label">Keterangan</label>
            <input className="input-field" placeholder="Lancar / Mengulang" value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
          </div>
          <div className="sm:col-span-3 flex gap-2 justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Simpan
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32 text-stone-400"><Loader2 className="animate-spin mr-2" /> Memuat...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-stone-400">
          <BookOpen size={36} className="mx-auto mb-2 text-stone-300" />
          Belum ada catatan setoran.
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-emerald-700 text-cream text-left">
                <th className="px-3 py-2 font-semibold border border-emerald-800">Tanggal</th>
                <th className="px-3 py-2 font-semibold border border-emerald-800">Jilid / Hal</th>
                <th className="px-3 py-2 font-semibold border border-emerald-800">Surat / Ayat</th>
                <th className="px-3 py-2 font-semibold border border-emerald-800">Keterangan</th>
                <th className="px-3 py-2 font-semibold border border-emerald-800 text-center">Guru</th>
                <th className="px-3 py-2 font-semibold border border-emerald-800 text-center">Ortu</th>
                <th className="px-3 py-2 border border-emerald-800 no-print" />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="odd:bg-white even:bg-cream/40">
                  <td className="px-3 py-2 border border-cream-dark whitespace-nowrap">{formatTanggalSingkat(s.tanggal)}</td>
                  <td className="px-3 py-2 border border-cream-dark">
                    {[s.jilid, s.halaman].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-3 py-2 border border-cream-dark">
                    {[s.surat, s.ayat].filter(Boolean).join(" : ") || "-"}
                  </td>
                  <td className="px-3 py-2 border border-cream-dark">{s.keterangan || "-"}</td>
                  <td className="px-3 py-2 border border-cream-dark text-center">
                    <ParafBtn active={s.parafGuru} onClick={() => toggleParaf(s, "parafGuru")} />
                  </td>
                  <td className="px-3 py-2 border border-cream-dark text-center">
                    <ParafBtn active={s.parafOrtu} onClick={() => toggleParaf(s, "parafOrtu")} />
                  </td>
                  <td className="px-3 py-2 border border-cream-dark text-center no-print">
                    <button onClick={() => hapus(s.id)} className="text-stone-300 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ParafBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-6 w-6 rounded-full inline-flex items-center justify-center transition ${
        active ? "bg-emerald text-white" : "bg-stone-100 text-stone-300 hover:bg-stone-200"
      }`}
      title={active ? "Sudah diparaf" : "Belum diparaf"}
    >
      {active ? <Check size={14} /> : <X size={14} />}
    </button>
  );
}
