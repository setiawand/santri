"use client";

import { useEffect, useState } from "react";

export interface Me {
  id: string;
  nama: string;
  email: string;
  role: string; // "admin" | "guru" | "ortu"
}

/** Info user yang sedang login (dari /api/auth/me). null selama memuat. */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setMe(d.user))
      .catch(() => {});
  }, []);
  return me;
}
