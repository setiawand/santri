"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, Pencil, Trash2, UserCog, X } from "lucide-react";
import { formatTanggalSingkat } from "@/lib/utils";

interface UserRow {
  id: string;
  nama: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { setoran: number; pembayaran: number };
}

interface FormState {
  nama: string;
  email: string;
  password: string;
  role: string;
}

const EMPTY_FORM: FormState = { nama: "", email: "", password: "", role: "guru" };

export function UserPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "tambah" | "edit"; target?: UserRow } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users?full=1");
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openTambah() {
    setForm(EMPTY_FORM);
    setError("");
    setModal({ mode: "tambah" });
  }

  function openEdit(u: UserRow) {
    setForm({ nama: u.nama, email: u.email, password: "", role: u.role });
    setError("");
    setModal({ mode: "edit", target: u });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    setError("");

    const isEdit = modal.mode === "edit";
    const url = isEdit ? `/api/users/${modal.target!.id}` : "/api/users";
    const body: Record<string, string> = { nama: form.nama, email: form.email, role: form.role };
    if (!isEdit || form.password) body.password = form.password;

    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Terjadi kesalahan");
      return;
    }
    setModal(null);
    load();
  }

  async function hapus(u: UserRow) {
    const totalCatatan = u._count.setoran + u._count.pembayaran;
    const detail =
      totalCatatan > 0
        ? `\n\n${u._count.setoran} catatan setoran dan ${u._count.pembayaran} catatan pembayaran yang diinput akun ini akan tetap tersimpan, tetapi kehilangan info penginputnya.`
        : "";
    if (!window.confirm(`Hapus akun "${u.nama}" (${u.email})?${detail}`)) return;

    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Gagal menghapus pengguna");
      return;
    }
    load();
  }

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl text-ink">Manajemen Pengguna</h1>
          <p className="text-stone-500">{users.length} akun terdaftar.</p>
        </div>
        <button onClick={openTambah} className="btn btn-primary">
          <Plus size={18} /> Tambah Pengguna
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-stone-400">
          <Loader2 className="animate-spin mr-2" /> Memuat...
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-dark/60 text-left text-stone-600">
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold text-center">Role</th>
                  <th className="px-4 py-3 font-semibold text-center">Setoran</th>
                  <th className="px-4 py-3 font-semibold text-center">Pembayaran</th>
                  <th className="px-4 py-3 font-semibold">Dibuat</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-cream/60 transition">
                    <td className="px-4 py-3 font-medium text-ink">
                      {u.nama}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-xs text-stone-400">(Anda)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{u.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.role === "admin"
                            ? "bg-gold/15 text-gold-dark"
                            : u.role === "ortu"
                              ? "bg-stone-100 text-stone-500"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {u.role === "ortu" ? "Orang Tua" : u.role === "admin" ? "Admin" : "Guru"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-stone-500">{u._count.setoran}</td>
                    <td className="px-4 py-3 text-center text-stone-500">{u._count.pembayaran}</td>
                    <td className="px-4 py-3 text-stone-500">{formatTanggalSingkat(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-stone-400 hover:text-emerald p-1"
                        title="Edit / reset password"
                      >
                        <Pencil size={16} />
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => hapus(u)}
                          className="text-stone-400 hover:text-red-600 p-1 ml-1"
                          title="Hapus akun"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative card w-full max-w-md p-6">
            <button
              onClick={() => setModal(null)}
              className="absolute right-4 top-4 text-stone-400 hover:text-stone-600"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
            <h2 className="font-serif text-xl text-ink flex items-center gap-2 mb-4">
              <UserCog size={20} className="text-emerald" />
              {modal.mode === "tambah" ? "Tambah Pengguna" : `Edit: ${modal.target?.nama}`}
            </h2>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Nama</label>
                <input
                  className="input-field"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {modal.mode === "tambah" ? "Password" : "Password Baru (kosongkan jika tetap)"}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  required={modal.mode === "tambah"}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Role</label>
                <select
                  className="input-field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  disabled={
                    modal.mode === "edit" &&
                    (modal.target?.id === currentUserId || modal.target?.role === "ortu")
                  }
                >
                  <option value="guru">Guru</option>
                  <option value="admin">Admin</option>
                  {modal.mode === "edit" && modal.target?.role === "ortu" && (
                    <option value="ortu">Orang Tua</option>
                  )}
                </select>
                {modal.mode === "edit" && modal.target?.id === currentUserId && (
                  <p className="text-xs text-stone-400 mt-1">
                    Role akun sendiri tidak bisa diubah.
                  </p>
                )}
                {modal.mode === "edit" && modal.target?.role === "ortu" && (
                  <p className="text-xs text-stone-400 mt-1">
                    Akun orang tua dikelola dari halaman detail santri.
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="btn bg-stone-100 text-stone-600 hover:bg-stone-200"
                >
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
