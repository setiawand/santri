"use client";

// Menu Laporan (staf): tiga laporan mengikuti format draft Excel dari pengelola —
// kartu pembayaran per santri, rekap pembayaran per bulan, dan daftar santri aktif.
import { useEffect, useState } from "react";
import { Loader2, Printer, Wallet, CalendarRange, Users } from "lucide-react";
import { formatRibuan, formatRupiah, formatTanggalSingkat, formatTanggal } from "@/lib/utils";

type Tab = "santri" | "bulan" | "aktif";

interface Meta { periodeList: string[]; bulanList: string[] }
interface SantriOpt { id: string; nama: string; nis: string | null }

const th = "px-3 py-2 font-semibold border border-emerald-800";
const td = "px-3 py-1.5 border border-cream-dark";

function LunasBadge({ lunas }: { lunas: boolean }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        lunas ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-400"
      }`}
    >
      {lunas ? "Lunas" : "-"}
    </span>
  );
}

/** Kop laporan bergaya dokumen (ikut tercetak). */
function Kop({ judul, sub }: { judul: string; sub: (string | null)[][] }) {
  return (
    <div className="mb-4">
      <h3 className="font-serif text-xl text-ink uppercase tracking-wide">{judul}</h3>
      <p className="text-xs text-stone-400">Markaz Qur'an Bekasi — Yayasan Al Husnayain 3</p>
      <div className="mt-2 text-sm text-stone-600">
        {sub.map(([k, v]) => (
          <p key={k}>
            <span className="inline-block w-24 text-stone-500">{k}</span>: <span className="font-medium text-ink">{v || "-"}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export default function LaporanPage() {
  const [tab, setTab] = useState<Tab>("santri");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [santriList, setSantriList] = useState<SantriOpt[]>([]);

  useEffect(() => {
    fetch("/api/laporan?jenis=meta").then((r) => r.json()).then(setMeta).catch(() => {});
    fetch("/api/santri")
      .then((r) => r.json())
      .then((d) => setSantriList(d.santri || []))
      .catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "santri", label: "Pembayaran per Santri", icon: Wallet },
    { id: "bulan", label: "Rekap per Bulan", icon: CalendarRange },
    { id: "aktif", label: "Santri Aktif", icon: Users },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="font-serif text-3xl text-ink">Laporan</h1>
          <p className="text-stone-500">Cetak laporan pembayaran dan data santri.</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Cetak
        </button>
      </header>

      <div className="flex gap-1 mb-5 border-b border-cream-dark no-print overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
                active ? "border-emerald text-emerald" : "border-transparent text-stone-500 hover:text-ink"
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "santri" && <LaporanPerSantri meta={meta} santriList={santriList} />}
      {tab === "bulan" && <LaporanPerBulan meta={meta} />}
      {tab === "aktif" && <LaporanSantriAktif />}
    </div>
  );
}

/* ===== Sheet 1: LAP. PEMBY PER SANTRI ===== */
function LaporanPerSantri({ meta, santriList }: { meta: Meta | null; santriList: SantriOpt[] }) {
  const [santriId, setSantriId] = useState("");
  const [periode, setPeriode] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!santriId && santriList.length) setSantriId(santriList[0].id);
  }, [santriList]);
  useEffect(() => {
    if (!periode && meta?.periodeList.length) setPeriode(meta.periodeList[0]);
  }, [meta]);
  useEffect(() => {
    if (!santriId || !periode) return;
    setLoading(true);
    fetch(`/api/laporan?jenis=pembayaran-santri&santriId=${santriId}&periode=${encodeURIComponent(periode)}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [santriId, periode]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 no-print">
        <div>
          <label className="label">Santri</label>
          <select className="input-field w-auto" value={santriId} onChange={(e) => setSantriId(e.target.value)}>
            {santriList.map((s) => (
              <option key={s.id} value={s.id}>{s.nama}{s.nis ? ` (${s.nis})` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tahun Ajaran</label>
          <select className="input-field w-auto" value={periode} onChange={(e) => setPeriode(e.target.value)}>
            {(meta?.periodeList || []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-32 text-stone-400"><Loader2 className="animate-spin mr-2" /> Memuat...</div>
      ) : (
        <div className="card p-5 sm:p-6">
          <Kop
            judul="Laporan Pembayaran Iuran"
            sub={[["Nama", data.santri?.nama], ["NIS", data.santri?.nis], ["Tahun Ajaran", data.periode]]}
          />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-emerald-700 text-cream text-left">
                  <th className={th}>Bulan</th>
                  <th className={th}>Tgl. Bayar</th>
                  <th className={`${th} text-right`}>Nominal (Rp)</th>
                  <th className={th}>Jenis Pemb.</th>
                  <th className={`${th} text-center`}>Lunas</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.bulan} className="odd:bg-white even:bg-cream/40">
                    <td className={`${td} font-medium text-ink`}>{r.bulan}</td>
                    <td className={td}>{r.tanggal ? formatTanggalSingkat(r.tanggal) : "-"}</td>
                    <td className={`${td} text-right`}>{formatRibuan(r.nominal) || "-"}</td>
                    <td className={td}>{r.metode || "-"}</td>
                    <td className={`${td} text-center`}><LunasBadge lunas={r.lunas} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-cream-dark/60 font-semibold text-ink">
                  <td className={td} colSpan={2}>Total</td>
                  <td className={`${td} text-right`}>{formatRupiah(data.total)}</td>
                  <td className={td} colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Sheet 2: REKAP PEMBY. PER BULAN ===== */
function LaporanPerBulan({ meta }: { meta: Meta | null }) {
  const [periode, setPeriode] = useState("");
  const [bulan, setBulan] = useState("Juli");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!periode && meta?.periodeList.length) setPeriode(meta.periodeList[0]);
  }, [meta]);
  useEffect(() => {
    if (!periode) return;
    setLoading(true);
    fetch(`/api/laporan?jenis=rekap-bulan&periode=${encodeURIComponent(periode)}&bulan=${encodeURIComponent(bulan)}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [periode, bulan]);

  return (
    <div>
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

      {loading || !data ? (
        <div className="flex items-center justify-center h-32 text-stone-400"><Loader2 className="animate-spin mr-2" /> Memuat...</div>
      ) : (
        <div className="card p-5 sm:p-6">
          <Kop
            judul="Laporan Pembayaran Iuran"
            sub={[["Periode", `${data.bulan} ${data.tahun ?? ""}`], ["Tahun Ajaran", data.periode]]}
          />
          <h4 className="font-semibold text-sm text-emerald-800 uppercase tracking-wide mb-2">Pemasukan</h4>
          {data.rows.length === 0 ? (
            <p className="text-stone-400 text-sm py-6 text-center">Belum ada pembayaran tercatat pada bulan ini.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-emerald-700 text-cream text-left">
                    <th className={`${th} w-10`}>No.</th>
                    <th className={th}>Nama</th>
                    <th className={th}>Tgl. Bayar</th>
                    <th className={th}>Bulan Iuran</th>
                    <th className={`${th} text-right`}>Nominal (Rp)</th>
                    <th className={th}>Keterangan</th>
                    <th className={`${th} text-center`}>Lunas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r: any, i: number) => (
                    <tr key={i} className="odd:bg-white even:bg-cream/40">
                      <td className={`${td} text-stone-500`}>{i + 1}</td>
                      <td className={`${td} font-medium text-ink`}>{r.nama}</td>
                      <td className={td}>{r.tanggal ? formatTanggalSingkat(r.tanggal) : "-"}</td>
                      <td className={td}>{r.bulanIuran || "-"}</td>
                      <td className={`${td} text-right`}>{formatRibuan(r.nominal) || "-"}</td>
                      <td className={td}>{r.metode || "-"}</td>
                      <td className={`${td} text-center`}><LunasBadge lunas={r.lunas} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-cream-dark/60 font-semibold text-ink">
                    <td className={td} colSpan={4}>Total Pemasukan</td>
                    <td className={`${td} text-right`}>{formatRupiah(data.total)}</td>
                    <td className={td} colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <h4 className="font-semibold text-sm text-emerald-800 uppercase tracking-wide mt-6 mb-2">Pengeluaran</h4>
          {(data.pengeluaran || []).length === 0 ? (
            <p className="text-stone-400 text-sm py-6 text-center">Tidak ada pengeluaran tercatat pada bulan ini.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-emerald-700 text-cream text-left">
                    <th className={`${th} w-10`}>No.</th>
                    <th className={th}>Tanggal</th>
                    <th className={th}>Kategori</th>
                    <th className={th}>Keterangan</th>
                    <th className={`${th} text-right`}>Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pengeluaran.map((r: any, i: number) => (
                    <tr key={i} className="odd:bg-white even:bg-cream/40">
                      <td className={`${td} text-stone-500`}>{i + 1}</td>
                      <td className={td}>{r.tanggal ? formatTanggalSingkat(r.tanggal) : "-"}</td>
                      <td className={td}>{r.kategori || "-"}</td>
                      <td className={td}>{r.keterangan}</td>
                      <td className={`${td} text-right`}>{formatRibuan(r.nominal) || "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-cream-dark/60 font-semibold text-ink">
                    <td className={td} colSpan={4}>Total Pengeluaran</td>
                    <td className={`${td} text-right`}>{formatRupiah(data.totalPengeluaran)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-cream-dark bg-cream/60 px-4 py-3">
              <p className="text-xs text-stone-500">Total Pemasukan</p>
              <p className="font-bold text-ink">{formatRupiah(data.total)}</p>
            </div>
            <div className="rounded-xl border border-cream-dark bg-cream/60 px-4 py-3">
              <p className="text-xs text-stone-500">Total Pengeluaran</p>
              <p className="font-bold text-ink">{data.totalPengeluaran ? `(${formatRupiah(data.totalPengeluaran)})` : "-"}</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${data.saldo < 0 ? "border-red-200 bg-red-50" : "border-emerald-100 bg-emerald-50/60"}`}>
              <p className="text-xs text-stone-500">Saldo Bulan Ini</p>
              <p className={`font-bold ${data.saldo < 0 ? "text-red-700" : "text-emerald-800"}`}>
                {data.saldo < 0 ? `- ${formatRupiah(Math.abs(data.saldo))}` : formatRupiah(data.saldo)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Sheet 3: DAFTAR SANTRI AKTIF ===== */
function LaporanSantriAktif() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/laporan?jenis=santri-aktif").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) {
    return <div className="flex items-center justify-center h-32 text-stone-400"><Loader2 className="animate-spin mr-2" /> Memuat...</div>;
  }

  return (
    <div className="card p-5 sm:p-6">
      <Kop judul="Laporan Santri Aktif" sub={[["Per Tanggal", formatTanggal(data.per)]]} />
      {data.rows.length === 0 ? (
        <p className="text-stone-400 text-sm py-8 text-center">Belum ada santri aktif.</p>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-emerald-700 text-cream text-left">
                <th className={`${th} w-10`}>No.</th>
                <th className={th}>Nama</th>
                <th className={th}>Pendidikan</th>
                <th className={th}>NIS</th>
                <th className={th}>Tgl. Masuk</th>
                <th className={th}>Pembimbing</th>
                <th className={th}>Program</th>
                <th className={th}>Hafalan Terakhir</th>
                <th className={th}>Pemb. Iuran Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r: any, i: number) => (
                <tr key={i} className="odd:bg-white even:bg-cream/40">
                  <td className={`${td} text-stone-500`}>{i + 1}</td>
                  <td className={`${td} font-medium text-ink whitespace-nowrap`}>{r.nama}</td>
                  <td className={td}>{r.pendidikan || "-"}</td>
                  <td className={td}>{r.nis || "-"}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatTanggalSingkat(r.tanggalMasuk)}</td>
                  <td className={td}>{r.pembimbing || "-"}</td>
                  <td className={td}>{r.program || "-"}</td>
                  <td className={td}>{r.hafalanTerakhir || "-"}</td>
                  <td className={td}>{r.pembayaranTerakhir || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-stone-400 mt-3 no-print">{data.rows.length} santri aktif.</p>
    </div>
  );
}
