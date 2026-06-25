"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, Loader2, Pencil, Trash2, Printer, User, BookOpenCheck, Wallet, Phone, MapPin, GraduationCap, Calendar,
} from "lucide-react";
import { SetoranPanel } from "@/components/SetoranPanel";
import { PembayaranPanel } from "@/components/PembayaranPanel";
import { SantriForm, type SantriData } from "@/components/SantriForm";
import { formatTanggal } from "@/lib/utils";

type Tab = "profil" | "setoran" | "pembayaran" | "edit";

export default function SantriDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [tab, setTab] = useState<Tab>("profil");
  const [notFound, setNotFound] = useState(false);

  async function load() {
    const res = await fetch(`/api/santri/${params.id}`);
    if (!res.ok) { setNotFound(true); return; }
    const data = await res.json();
    setSantri(data.santri);
  }
  useEffect(() => { load(); }, [params.id]);

  async function hapus() {
    if (!confirm("Hapus santri ini beserta seluruh data setoran & pembayarannya?")) return;
    await fetch(`/api/santri/${params.id}`, { method: "DELETE" });
    router.push("/santri");
    router.refresh();
  }

  if (notFound) {
    return (
      <div className="p-8 text-center text-stone-500">
        Santri tidak ditemukan. <Link href="/santri" className="text-emerald underline">Kembali</Link>
      </div>
    );
  }
  if (!santri) {
    return <div className="flex items-center justify-center h-64 text-stone-400"><Loader2 className="animate-spin mr-2" /> Memuat...</div>;
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "profil", label: "Profil", icon: User },
    { id: "setoran", label: "Setoran Tilawah", icon: BookOpenCheck },
    { id: "pembayaran", label: "Pembayaran", icon: Wallet },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <Link href="/santri" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-emerald mb-4 no-print">
        <ChevronLeft size={16} /> Daftar Santri
      </Link>

      {/* Header */}
      <div className="card p-6 mb-5 bg-arabesque text-cream">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gold/25 flex items-center justify-center text-2xl font-serif text-white">
              {santri.nama?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-white">{santri.nama}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-cream-dark/80">
                {santri.nis && <span>NIS: {santri.nis}</span>}
                {santri.kelas && <span>{santri.kelas}</span>}
                <span className={`px-2 py-0.5 rounded-full text-xs ${santri.status === "aktif" ? "bg-emerald-600/40 text-white" : "bg-white/15"}`}>
                  {santri.status === "aktif" ? "Aktif" : "Non-aktif"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <button onClick={() => window.print()} className="btn btn-ghost border-white/30 text-white hover:bg-white/10">
              <Printer size={16} /> Cetak
            </button>
            <button onClick={() => setTab("edit")} className="btn btn-gold">
              <Pencil size={16} /> Edit
            </button>
            <button onClick={hapus} className="btn btn-danger">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tab !== "edit" && (
        <div className="flex gap-1 mb-5 border-b border-cream-dark no-print">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                  active ? "border-emerald text-emerald" : "border-transparent text-stone-500 hover:text-ink"
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {tab === "profil" && <Profil santri={santri} />}
      {tab === "setoran" && <SetoranPanel santriId={params.id} />}
      {tab === "pembayaran" && <PembayaranPanel santriId={params.id} />}
      {tab === "edit" && (
        <div>
          <div className="flex items-center justify-between mb-4 no-print">
            <h2 className="font-serif text-2xl text-ink">Edit Data Santri</h2>
            <button className="btn btn-ghost" onClick={() => setTab("profil")}>Kembali ke profil</button>
          </div>
          <SantriForm initial={santri} />
        </div>
      )}
    </div>
  );
}

function Profil({ santri }: { santri: SantriData }) {
  const Row = ({ icon: Icon, label, value }: { icon?: any; label: string; value?: string | null }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-cream-dark last:border-0">
      {Icon && <Icon size={16} className="text-gold-dark mt-0.5 shrink-0" />}
      <div className="grid grid-cols-3 gap-2 flex-1">
        <span className="text-sm text-stone-500">{label}</span>
        <span className="col-span-2 text-sm text-ink font-medium">{value || "-"}</span>
      </div>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="card p-6">
        <h3 className="font-serif text-lg text-ink mb-3">Data Santri</h3>
        <Row icon={GraduationCap} label="Pendidikan" value={santri.pendidikan} />
        <Row icon={Calendar} label="Tempat, Tgl Lahir" value={[santri.tempatLahir, santri.tanggalLahir ? formatTanggal(santri.tanggalLahir) : ""].filter(Boolean).join(", ")} />
        <Row icon={MapPin} label="Alamat" value={santri.alamat} />
        <Row label="Program Belajar" value={santri.programBelajar} />
        <Row label="Waktu Belajar" value={santri.waktuBelajar} />
      </div>
      <div className="card p-6">
        <h3 className="font-serif text-lg text-ink mb-3">Data Orang Tua</h3>
        <Row icon={User} label="Nama Ayah" value={santri.namaAyah} />
        <Row icon={Phone} label="HP Ayah" value={santri.hpAyah} />
        <Row label="Pekerjaan Ayah" value={santri.pekerjaanAyah} />
        <Row icon={User} label="Nama Ibu" value={santri.namaIbu} />
        <Row icon={Phone} label="HP Ibu" value={santri.hpIbu} />
        <Row label="Pekerjaan Ibu" value={santri.pekerjaanIbu} />
      </div>
    </div>
  );
}
