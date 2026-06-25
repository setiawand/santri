"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  BookOpenCheck,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/santri", label: "Data Santri", icon: Users },
];

export function Sidebar({ user }: { user: { nama: string; email: string; role: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="bg-white rounded-lg p-1.5">
          <Logo size={34} />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-lg text-white leading-none">Markaz Qur'an</p>
          <p className="text-[11px] text-gold-light tracking-wide">Sistem Santri</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-gold text-white shadow-sm"
                  : "text-cream-dark/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="h-9 w-9 rounded-full bg-gold/30 flex items-center justify-center text-white font-semibold text-sm">
            {user.nama.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{user.nama}</p>
            <p className="text-[11px] text-cream-dark/60 capitalize">{user.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-cream-dark/80 hover:bg-white/10 hover:text-white transition"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Topbar mobile */}
      <div className="lg:hidden flex items-center justify-between bg-arabesque text-white px-4 py-3 no-print">
        <div className="flex items-center gap-2">
          <BookOpenCheck size={20} className="text-gold-light" />
          <span className="font-serif text-lg">Markaz Qur'an</span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Buka menu">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden lg:block w-64 shrink-0 bg-arabesque no-print">{content}</aside>

      {/* Drawer mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-arabesque">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 text-white/70"
              aria-label="Tutup menu"
            >
              <X size={22} />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
