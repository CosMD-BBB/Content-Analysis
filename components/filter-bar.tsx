"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Opt = { value: string; label: string };

/** ตัวกรองที่เก็บค่าไว้ใน URL (แชร์ลิงก์ที่กรองแล้วได้) */
export function FilterBar({ selects, search }: { selects: { name: string; label: string; options: Opt[] }[]; search?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v); else n.delete(k);
    router.replace(`${path}?${n.toString()}`);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="filters">
      {search && (
        <input className="input" type="search" placeholder="ค้นหาชื่อหรือแคปชัน" aria-label="ค้นหา" value={q}
          onChange={(e) => { setQ(e.target.value); clearTimeout(timer.current); const v = e.target.value; timer.current = setTimeout(() => set("q", v.trim()), 350); }} />
      )}
      {selects.map((s) => (
        <select key={s.name} className="select" aria-label={s.label} value={sp.get(s.name) ?? ""} onChange={(e) => set(s.name, e.target.value)}>
          <option value="">{s.label}</option>
          {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
    </div>
  );
}
