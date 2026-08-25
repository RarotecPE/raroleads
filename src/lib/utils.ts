export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

const dtf = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(d?: Date | string | null): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  return dtf.format(dt);
}

/** Dias até a data (negativo = vencido). */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date(`${todayISO()}T00:00:00`).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
