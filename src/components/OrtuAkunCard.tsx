"use client";

// Kartu pengelolaan akun login orang tua pada halaman detail santri (khusus staf).
import { useState } from "react";
import { KeyRound, Link2Off, Loader2, UserPlus } from "lucide-react";

interface Akun {
  id: string;
  nama: string;
  email: string;
}

export function OrtuAkunCard({
  santriId,
  orangtua,
  onChanged,
}: {
  santriId: string;
  orangtua: Akun | null | undefined;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({ nama: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function call(method: string, body?: unknown) {
    setBusy(true);
    setError("");
    setInfo("");
    const res = await fetch(`/api/santri/${santriId}/ortu`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Gagal memproses");
      return false;
    }
    return true;
  }

  async function buat(e: React.FormEvent) {
    e.preventDefault();
    if (await call("POST", form)) {
      setForm({ nama: "", email: "", password: "" });
      onChanged();
    }
  }

  async function resetPassword() {
    const password = prompt("Kata sandi baru untuk akun orang tua (minimal 6 karakter):");
    if (!password) return;
    if (await call("PATCH", { password })) setInfo("Kata sandi berhasil diganti.");
  }

  async function putuskan() {
    if (!confirm("Putuskan tautan akun orang tua dari santri ini? Akunnya tidak dihapus.")) return;
    if (await call("DELETE")) onChanged();
  }

  return (
    <div className="card p-6 md:col-span-2">
      <h3 className="font-serif text-lg text-ink mb-3">Akun Login Orang Tua</h3>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}
      {info && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
          {info}
        </div>
      )}

      {orangtua ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">{orangtua.nama}</p>
            <p className="text-sm text-stone-500">{orangtua.email}</p>
            <p className="text-xs text-stone-400 mt-1">
              Orang tua bisa masuk dengan email di atas untuk melihat setoran & pembayaran anaknya.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={resetPassword} disabled={busy}>
              <KeyRound size={16} /> Ganti Sandi
            </button>
            <button className="btn btn-danger" onClick={putuskan} disabled={busy}>
              <Link2Off size={16} /> Putuskan
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={buat} className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Nama</label>
            <input
              className="input-field"
              placeholder="Nama orang tua"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input-field"
              placeholder="ortu@contoh.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Kata Sandi *</label>
            <input
              type="password"
              className="input-field"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between gap-3">
            <p className="text-xs text-stone-400">
              Jika email sudah terdaftar sebagai akun orang tua (kakak/adik), akunnya langsung
              ditautkan tanpa mengganti kata sandi.
            </p>
            <button type="submit" className="btn btn-primary shrink-0" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Buat / Tautkan
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
