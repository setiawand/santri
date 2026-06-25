"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk");
        setLoading(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel kiri (branding) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-arabesque text-cream p-12 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl p-2">
            <Logo size={44} />
          </div>
          <div>
            <p className="font-serif text-2xl leading-tight text-white">Markaz Qur'an</p>
            <p className="text-sm text-gold-light tracking-wide">Bekasi · Yayasan Al Husnayain 3</p>
          </div>
        </div>
        <div>
          <p className="font-serif text-4xl leading-snug text-white mb-4">
            Sistem Administrasi Santri
          </p>
          <p className="text-cream-dark/80 max-w-md leading-relaxed">
            Kelola pendaftaran santri, catatan setoran tilawah, dan pembayaran iuran
            dalam satu tempat yang rapi dan mudah.
          </p>
        </div>
        <p className="text-xs text-cream-dark/60">
          Jl. Gunung Merapi Raya No. 51 — Bekasi Barat
        </p>
      </div>

      {/* Panel kanan (form) */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Logo size={40} />
            <span className="font-serif text-xl">Markaz Qur'an Bekasi</span>
          </div>

          <h1 className="text-2xl font-bold text-ink mb-1">Selamat Datang</h1>
          <p className="text-sm text-stone-500 mb-7">Masuk untuk mengelola data santri.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="admin@markazquran.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Kata Sandi</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <div className="mt-8 text-xs text-stone-400 bg-cream-dark/50 border border-cream-dark rounded-lg p-3">
            <p className="font-semibold text-stone-500 mb-1">Akun demo:</p>
            <p>admin@markazquran.id / admin123</p>
            <p>guru@markazquran.id / guru123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
