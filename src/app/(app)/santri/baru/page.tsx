import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SantriForm } from "@/components/SantriForm";

export default function SantriBaruPage() {
  return (
    <div className="p-5 sm:p-8 max-w-4xl mx-auto">
      <Link href="/santri" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-emerald mb-4">
        <ChevronLeft size={16} /> Kembali ke daftar santri
      </Link>
      <h1 className="font-serif text-3xl text-ink mb-1">Formulir Pendaftaran Santri</h1>
      <p className="text-stone-500 mb-6">Isi data santri baru. Kolom bertanda * wajib diisi.</p>
      <SantriForm />
    </div>
  );
}
