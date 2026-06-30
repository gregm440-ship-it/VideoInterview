// Small date helpers working in local time with YYYY-MM-DD strings.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDaysISO(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** "Mar 8" */
export function formatShort(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
