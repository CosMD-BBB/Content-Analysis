/** ประเทศไทยไม่มีเวลาออมแสง จึงใช้ค่าชดเชยคงที่ +07:00 */
export const TZ = "Asia/Bangkok";
const OFFSET_MS = 7 * 60 * 60 * 1000;

const MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export const DAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const pad = (n: number) => String(n).padStart(2, "0");

/** วันที่ (YYYY-MM-DD) + เวลา (HH:mm) ตามเวลาไทย → Date */
export function fromBangkokInput(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error("invalid date/time");
  const d = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(d.getTime())) throw new Error("invalid date/time");
  return d;
}

/** ส่วนประกอบของวันเวลาในเขตเวลาไทย */
export function bangkokParts(d: Date) {
  const s = new Date(d.getTime() + OFFSET_MS);
  return { year: s.getUTCFullYear(), month: s.getUTCMonth(), day: s.getUTCDate(), hour: s.getUTCHours(), minute: s.getUTCMinutes(), weekday: s.getUTCDay() };
}

export function bangkokDayKey(d: Date): string {
  const p = bangkokParts(d);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

export function bangkokTime(d: Date): string {
  const p = bangkokParts(d);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatThai(d: Date, style: "date" | "datetime" | "short"): string {
  const p = bangkokParts(d);
  const short = `${p.day} ${MONTHS_SHORT[p.month]}`;
  if (style === "short") return short;
  const date = `${short} ${p.year + 543}`;
  return style === "date" ? date : `${date} · ${pad(p.hour)}:${pad(p.minute)} น.`;
}

/** เพิ่มจำนวนวันให้ dayKey */
export function addDaysKey(dayKey: string, n: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
