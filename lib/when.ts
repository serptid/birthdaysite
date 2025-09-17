// lib/when.ts
export function todayInTZ(tz: string) {
  const fmt = new Intl.DateTimeFormat("ru-RU", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day };
}

export function addDaysUTC(y: number, m: number, d: number, delta: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// "YYYY-MM-DD" → {y,m,d}
export function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function pad2(n: number) { return n.toString().padStart(2, "0"); }
export function mmdd(y: number, m: number, d: number) { return `${pad2(m)}-${pad2(d)}`; }
