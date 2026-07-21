# Separator Ribuan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tampilkan dan terima input angka rupiah dengan separator ribuan (titik) di seluruh aplikasi — baik di layar display maupun di field input iuran dan infaq.

**Architecture:** Buat komponen `RupiahInput` reusable yang menggantikan `<input type="number">` di `PembayaranPanel`. Display sudah ditangani `formatRupiah` di `src/lib/utils.ts` — audit semua tempat yang menampilkan angka untuk memastikan konsistensi.

**Tech Stack:** React client component, `Intl.NumberFormat("id-ID")` (sudah tersedia di browser dan Node).

## Global Constraints

- `npm run build` harus lulus tanpa error setelah setiap task.
- Tidak ada dependency baru.
- Nilai yang disimpan ke database tetap berupa integer (tanpa formatting).
- Format display: angka dengan titik ribuan, tanpa "Rp" (header kolom sudah menjelaskan satuan). Contoh: `150.000`.
- Format `formatRupiah` di `src/lib/utils.ts` (untuk total/summary) tidak diubah — sudah benar dengan "Rp" prefix.

---

## File Map

| File | Status | Tanggung jawab |
|------|--------|----------------|
| `src/components/RupiahInput.tsx` | Create | Input teks dengan mask separator ribuan |
| `src/components/PembayaranPanel.tsx` | Modify | Ganti `<input type="number">` dengan `RupiahInput` |

---

### Task 1: Buat komponen RupiahInput

**Files:**
- Create: `src/components/RupiahInput.tsx`

**Interfaces:**
- Produces: `RupiahInput({ value, onChange, onBlur, className? })`
  - `value: number` — nilai integer dari state parent
  - `onChange(n: number): void` — dipanggil setiap ketikan, nilai sudah di-parse ke integer
  - `onBlur(n: number): void` — dipanggil saat blur, untuk trigger save ke API
  - `className?: string` — class tambahan untuk input

- [ ] **Step 1: Buat `src/components/RupiahInput.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

function toDisplay(n: number): string {
  if (!n) return "";
  return n.toLocaleString("id-ID");
}

function fromDisplay(s: string): number {
  const raw = s.replace(/\./g, "").replace(/[^0-9]/g, "");
  return parseInt(raw) || 0;
}

export function RupiahInput({
  value,
  onChange,
  onBlur,
  className = "",
}: {
  value: number;
  onChange: (n: number) => void;
  onBlur: (n: number) => void;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => toDisplay(value));

  // Sync dari luar (misal saat data di-reload)
  useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\./g, "").replace(/[^0-9]/g, "");
    const n = parseInt(raw) || 0;
    setDisplay(raw ? n.toLocaleString("id-ID") : "");
    onChange(n);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const n = fromDisplay(e.target.value);
    setDisplay(toDisplay(n));
    onBlur(n);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className={`input-field py-1 text-right ${className}`}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
```

- [ ] **Step 2: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RupiahInput.tsx
git commit -m "feat: komponen RupiahInput dengan separator ribuan otomatis"
```

---

### Task 2: Ganti input number di PembayaranPanel

**Files:**
- Modify: `src/components/PembayaranPanel.tsx`

**Interfaces:**
- Consumes: `RupiahInput` dari `src/components/RupiahInput.tsx`
- Produces: input iuran dan infaq menampilkan format ribuan saat mengetik dan saat idle

- [ ] **Step 1: Tambah import RupiahInput di `src/components/PembayaranPanel.tsx`**

```tsx
import { RupiahInput } from "./RupiahInput";
```

- [ ] **Step 2: Ganti input iuran**

Sebelum:
```tsx
<input
  type="number"
  min={0}
  className="input-field py-1 text-right"
  value={b.iuran || ""}
  onChange={(e) => setLocal(b.id, { iuran: parseInt(e.target.value) || 0 })}
  onBlur={(e) => save(b.id, { iuran: parseInt(e.target.value) || 0 })}
/>
```

Sesudah:
```tsx
<RupiahInput
  value={b.iuran}
  onChange={(n) => setLocal(b.id, { iuran: n })}
  onBlur={(n) => save(b.id, { iuran: n })}
/>
```

- [ ] **Step 3: Ganti input infaq**

Sebelum:
```tsx
<input
  type="number"
  min={0}
  className="input-field py-1 text-right"
  value={b.infaq || ""}
  onChange={(e) => setLocal(b.id, { infaq: parseInt(e.target.value) || 0 })}
  onBlur={(e) => save(b.id, { infaq: parseInt(e.target.value) || 0 })}
/>
```

Sesudah:
```tsx
<RupiahInput
  value={b.infaq}
  onChange={(n) => setLocal(b.id, { infaq: n })}
  onBlur={(n) => save(b.id, { infaq: n })}
/>
```

- [ ] **Step 4: Jika `readOnly` prop sudah ada (dari plan login-orang-tua), pastikan RupiahInput juga disabled saat readOnly**

Jika prop `readOnly` sudah diimplementasikan, ganti menjadi:
```tsx
{readOnly ? (
  <span className="text-sm text-right block">{b.iuran ? b.iuran.toLocaleString("id-ID") : "-"}</span>
) : (
  <RupiahInput value={b.iuran} onChange={(n) => setLocal(b.id, { iuran: n })} onBlur={(n) => save(b.id, { iuran: n })} />
)}
```

Lakukan hal yang sama untuk infaq.

- [ ] **Step 5: Verifikasi build**

```bash
npm run build
```

- [ ] **Step 6: Test manual di `npm run dev`**

Checklist:
- [ ] Buka halaman detail santri → tab Pembayaran
- [ ] Klik field Iuran, ketik `150000` → tampil `150.000`
- [ ] Ketik `200000` → tampil `200.000`
- [ ] Blur dari field → angka tersimpan dan tampil dengan format
- [ ] Total di tfoot masih menampilkan format "Rp 150.000" via `formatRupiah`
- [ ] Nilai yang tersimpan di DB tetap integer (cek di `npm run db:studio`)

- [ ] **Step 7: Commit**

```bash
git add src/components/PembayaranPanel.tsx
git commit -m "feat: input iuran dan infaq dengan separator ribuan otomatis"
```

---

**Selesai.** Push ke remote:
```bash
git push
```
