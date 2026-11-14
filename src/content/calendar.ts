import { addDaysKey, bangkokDayKey } from "../lib/time";

const pad = (n: number) => String(n).padStart(2, "0");

/** ช่องวันของเดือน (เริ่มวันจันทร์ จบวันอาทิตย์ ครบทุกสัปดาห์) */
export function monthGrid(year: number, month0: number): string[] {
  const first = `${year}-${pad(month0 + 1)}-01`;
  const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const last = `${year}-${pad(month0 + 1)}-${pad(lastDay)}`;
  const dow = (k: string) => new Date(`${k}T00:00:00Z`).getUTCDay();
  const start = addDaysKey(first, -((dow(first) + 6) % 7));
  const end = addDaysKey(last, (7 - dow(last)) % 7);
  const out: string[] = [];
  for (let k = start; k <= end; k = addDaysKey(k, 1)) out.push(k);
  return out;
}

/** วันจันทร์ถึงอาทิตย์ของสัปดาห์ที่มีวันนี้ */
export function weekGrid(dayKey: string): string[] {
  const dow = new Date(`${dayKey}T00:00:00Z`).getUTCDay();
  const start = addDaysKey(dayKey, -((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
}

export function groupByDay<T extends { scheduledAt: Date }>(items: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) (out[bangkokDayKey(it.scheduledAt)] ||= []).push(it);
  for (const k of Object.keys(out)) out[k].sort((a, b) => +a.scheduledAt - +b.scheduledAt);
  return out;
}
