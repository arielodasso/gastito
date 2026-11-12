import { todayKey } from "./format";

export type Tipo503020 = "Necesidades" | "Deseos" | "Ahorro";

export interface Ingreso {
  id: string;
  fecha: string;
  cliente_fuente: string;
  tipo: string | null;
  proyecto: string | null;
  monto: number;
  moneda: string | null;
  monto_ars: number | null;
  cobrado: boolean;
  notas: string | null;
}

export interface Gasto {
  id: string;
  fecha: string;
  concepto: string;
  categoria: string;
  tipo_503020: Tipo503020 | string;
  monto: number;
  moneda: string | null;
  monto_ars: number | null;
  medio_pago: string | null;
  fijo_variable: string | null;
}

export interface MesResumen {
  clave: string;
  ano: number;
  mes: number;
  ingresos: number;
  gastos: number;
  inicial: number;
  final: number;
  variacion: number;
  necesidades: number;
  deseos: number;
  ahorro: number;
}

export interface Movimiento {
  id: string;
  tipo: "ingreso" | "gasto";
  titulo: string;
  detalle: string;
  fecha: string;
  monto: number;
  categoria: string;
  tipo503020?: string;
}

export const PATRIMONIO_INICIAL_BASE = 1_975_020.34;

export const RULE = {
  necesidades: 0.5,
  deseos: 0.3,
  ahorro: 0.2,
};

export function amountOf(row: {
  monto_ars?: number | null;
  monto?: number | null;
}): number {
  const ars = Number(row.monto_ars);
  if (Number.isFinite(ars) && ars !== 0) return ars;
  return Number(row.monto) || 0;
}

export function monthKeyOf(fecha: string): string {
  return String(fecha || "").slice(0, 7);
}

function monthRange(start: string, end: string): string[] {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const out: string[] = [];
  let year = sy;
  let month = sm;
  while (year < ey || (year === ey && month <= em)) {
    out.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

export function buildMonthly(ingresos: Ingreso[], gastos: Gasto[]): MesResumen[] {
  const data = new Map<
    string,
    { ingresos: number; gastos: number; necesidades: number; deseos: number; ahorro: number }
  >();

  const ensure = (key: string) => {
    if (!data.has(key)) {
      data.set(key, {
        ingresos: 0,
        gastos: 0,
        necesidades: 0,
        deseos: 0,
        ahorro: 0,
      });
    }
    return data.get(key)!;
  };

  for (const row of ingresos) {
    const key = monthKeyOf(row.fecha);
    if (!key) continue;
    ensure(key).ingresos += amountOf(row);
  }

  for (const row of gastos) {
    const key = monthKeyOf(row.fecha);
    if (!key) continue;
    const entry = ensure(key);
    const amount = amountOf(row);
    entry.gastos += amount;
    if (row.tipo_503020 === "Necesidades") entry.necesidades += amount;
    else if (row.tipo_503020 === "Ahorro") entry.ahorro += amount;
    else entry.deseos += amount;
  }

  const actual = todayKey();
  const keys = Array.from(data.keys()).sort();
  if (keys.length === 0) return [];

  const start = keys[0];
  const end = keys[keys.length - 1] > actual ? keys[keys.length - 1] : actual;

  let inicial = PATRIMONIO_INICIAL_BASE;
  return monthRange(start, end).map((clave) => {
    const entry = data.get(clave) || {
      ingresos: 0,
      gastos: 0,
      necesidades: 0,
      deseos: 0,
      ahorro: 0,
    };
    const final = inicial + entry.ingresos - entry.gastos;
    const [ano, mes] = clave.split("-").map(Number);
    const row: MesResumen = {
      clave,
      ano,
      mes,
      ingresos: entry.ingresos,
      gastos: entry.gastos,
      inicial,
      final,
      variacion: final - inicial,
      necesidades: entry.necesidades,
      deseos: entry.deseos,
      ahorro: entry.ahorro,
    };
    inicial = final;
    return row;
  });
}

export function buildMovements(
  ingresos: Ingreso[],
  gastos: Gasto[]
): Movimiento[] {
  const movements: Movimiento[] = [
    ...ingresos.map((row) => ({
      id: row.id,
      tipo: "ingreso" as const,
      titulo: row.cliente_fuente || "Ingreso",
      detalle: [row.tipo, row.proyecto].filter(Boolean).join(" · ") || "Ingreso",
      fecha: row.fecha,
      monto: amountOf(row),
      categoria: row.tipo || "Ingreso",
    })),
    ...gastos.map((row) => ({
      id: row.id,
      tipo: "gasto" as const,
      titulo: row.concepto || "Gasto",
      detalle: [row.categoria, row.medio_pago].filter(Boolean).join(" · "),
      fecha: row.fecha,
      monto: amountOf(row),
      categoria: row.categoria || "Gasto",
      tipo503020: row.tipo_503020,
    })),
  ];

  return movements.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

export function topCategories(gastos: Gasto[], clave: string, limit = 5) {
  const totals = new Map<string, number>();
  for (const row of gastos) {
    if (monthKeyOf(row.fecha) !== clave) continue;
    const key = row.categoria || "Otros";
    totals.set(key, (totals.get(key) || 0) + amountOf(row));
  }
  return Array.from(totals.entries())
    .map(([categoria, monto]) => ({ categoria, monto }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limit);
}
