"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

export interface SantriData {
  id?: string;
  nama?: string;
  nis?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  pendidikan?: string;
  alamat?: string;
  kelas?: string;
  namaAyah?: string;
  hpAyah?: string;
  pekerjaanAyah?: string;
  namaIbu?: string;
  hpIbu?: string;
  pekerjaanIbu?: string;
  programBelajar?: string;
  waktuBelajar?: string;
  status?: string;
}

function toDateInput(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// Didefinisikan di scope modul (stabil) agar input tidak kehilangan fokus saat mengetik.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="font-serif text-lg text-ink mb-4 pb-2 border-b border-cream-dark">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function TextField({
  label, value, onChange, type = "text", full = false, placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  full?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SantriForm({ initial }: { initial?: SantriData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<SantriData>({
    status: "aktif",
    ...initial,
    tanggalLahir: toDateInput(initial?.tanggalLahir),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof SantriData>(key: K, val: SantriData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }
  const v = (k: keyof SantriData) => (form[k] as string) || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.nama?.trim()) {
      setError("Nama santri wajib diisi");
      return;
    }
    setSaving(true);
    const url = isEdit ? `/api/santri/${initial!.id}` : "/api/santri";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal menyimpan");
      setSaving(false);
      return;
    }
    router.push(`/santri/${data.santri.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <Section title="Data Santri">
        <TextField label="Nama Santri *" value={v("nama")} onChange={(x) => set("nama", x)} full placeholder="Nama lengkap santri" />
        <TextField label="NIS" value={v("nis")} onChange={(x) => set("nis", x)} placeholder="Nomor induk santri" />
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Non-aktif</option>
          </select>
        </div>
        <TextField label="Tempat Lahir" value={v("tempatLahir")} onChange={(x) => set("tempatLahir", x)} />
        <TextField label="Tanggal Lahir" value={v("tanggalLahir")} onChange={(x) => set("tanggalLahir", x)} type="date" />
        <TextField label="Pendidikan" value={v("pendidikan")} onChange={(x) => set("pendidikan", x)} placeholder="contoh: SD / SMP" />
        <TextField label="Kelas / Kelompok" value={v("kelas")} onChange={(x) => set("kelas", x)} placeholder="contoh: Tahsin 1" />
        <TextField label="Alamat" value={v("alamat")} onChange={(x) => set("alamat", x)} full />
      </Section>

      <Section title="Data Orang Tua">
        <TextField label="Nama Ayah" value={v("namaAyah")} onChange={(x) => set("namaAyah", x)} />
        <TextField label="Nomor HP Ayah" value={v("hpAyah")} onChange={(x) => set("hpAyah", x)} type="tel" />
        <TextField label="Pekerjaan Ayah" value={v("pekerjaanAyah")} onChange={(x) => set("pekerjaanAyah", x)} full />
        <TextField label="Nama Ibu" value={v("namaIbu")} onChange={(x) => set("namaIbu", x)} />
        <TextField label="Nomor HP Ibu" value={v("hpIbu")} onChange={(x) => set("hpIbu", x)} type="tel" />
        <TextField label="Pekerjaan Ibu" value={v("pekerjaanIbu")} onChange={(x) => set("pekerjaanIbu", x)} full />
      </Section>

      <Section title="Program Belajar">
        <TextField label="Program Belajar" value={v("programBelajar")} onChange={(x) => set("programBelajar", x)} placeholder="contoh: Tahsin & Tilawah" />
        <TextField label="Waktu Belajar" value={v("waktuBelajar")} onChange={(x) => set("waktuBelajar", x)} placeholder="contoh: Sore (16.00-17.30)" />
      </Section>

      <div className="flex gap-3 justify-end">
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isEdit ? "Simpan Perubahan" : "Daftarkan Santri"}
        </button>
      </div>
    </form>
  );
}
