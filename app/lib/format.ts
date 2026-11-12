const MONTHS_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function money(value: number | null | undefined, decimals = 0): string {
  return (Number(value) || 0).toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function ars(value: number | null | undefined, decimals = 0): string {
  return `$ ${money(value, decimals)}`;
}

export function compactMoney(value: number | null | undefined): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `$ ${(n / 1_000_000).toLocaleString("es-AR", {
      maximumFractionDigits: 2,
    })} M`;
  }
  if (abs >= 10_000) {
    return `$ ${Math.round(n / 1000).toLocaleString("es-AR")} k`;
  }
  return ars(n);
}

export function signed(value: number | null | undefined, formatter = ars): string {
  const n = Number(value) || 0;
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${formatter(Math.abs(n))}`;
}

export function pct(value: number | null | undefined, decimals = 0): string {
  return `${(Number(value) || 0).toLocaleString("es-AR", {
    maximumFractionDigits: decimals,
  })}%`;
}

export function monthLabel(key: string, long = false): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  const names = long ? MONTHS_LONG : MONTHS_SHORT;
  return `${names[month - 1]} ${year}`;
}

export function monthShort(key: string): string {
  const [, month] = key.split("-").map(Number);
  if (!month) return key;
  return MONTHS_SHORT[month - 1];
}

export function dateLabel(fecha: string): string {
  if (!fecha) return "";
  const [year, month, day] = fecha.split("-").map(Number);
  if (!year || !month || !day) return fecha;
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
