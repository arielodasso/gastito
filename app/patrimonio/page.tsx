"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/supabaseClient";
import TopNav from "@/app/components/TopNav";
import { PatrimonioChart } from "@/app/components/Charts";
import {
  amountOf,
  buildMonthly,
  RULE,
  type Gasto,
  type Ingreso,
} from "@/app/lib/finance";
import { ars, compactMoney, monthLabel, pct, signed, todayKey } from "@/app/lib/format";

export default function PatrimonioPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [incomeResult, expenseResult] = await Promise.all([
        supabase
          .from("ingresos")
          .select(
            "id,fecha,cliente_fuente,tipo,proyecto,monto,moneda,monto_ars,cobrado,notas"
          )
          .order("fecha", { ascending: true }),
        supabase
          .from("gastos")
          .select(
            "id,fecha,concepto,categoria,tipo_503020,monto,moneda,monto_ars,medio_pago,fijo_variable"
          )
          .order("fecha", { ascending: true }),
      ]);

      if (incomeResult.error || expenseResult.error) {
        setError("No pudimos cargar el patrimonio.");
      } else {
        setIngresos((incomeResult.data as Ingreso[]) || []);
        setGastos((expenseResult.data as Gasto[]) || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const monthly = useMemo(() => buildMonthly(ingresos, gastos), [ingresos, gastos]);
  const currentKey = todayKey();
  const current = monthly.find((row) => row.clave === currentKey) || monthly[monthly.length - 1];
  const base = monthly[0]?.inicial ?? 0;
  const best = monthly.reduce(
    (acc, row) => (row.variacion > acc.variacion ? row : acc),
    monthly[0] || { clave: currentKey, variacion: 0 }
  );
  const accumulated = useMemo(
    () => ingresos.reduce((sum, row) => sum + amountOf(row), 0) - gastos.reduce((sum, row) => sum + amountOf(row), 0),
    [ingresos, gastos]
  );

  const budgets = [
    {
      label: "Necesidades",
      targetPct: "50%",
      spent: current?.necesidades ?? 0,
      target: (current?.ingresos ?? 0) * RULE.necesidades,
      variant: "progress",
    },
    {
      label: "Deseos",
      targetPct: "30%",
      spent: current?.deseos ?? 0,
      target: (current?.ingresos ?? 0) * RULE.deseos,
      variant: "progress sky",
    },
    {
      label: "Ahorro / Inversión",
      targetPct: "20%",
      spent: current?.ahorro ?? 0,
      target: (current?.ingresos ?? 0) * RULE.ahorro,
      variant: "progress mint",
    },
  ];

  return (
    <>
      <TopNav />
      <main className="container page">
        <div className="section-head">
          <div>
            <span className="kicker">Patrimonio</span>
            <h2>Tu evolución, mes a mes</h2>
            <p>El mismo seguimiento de tu Excel, calculado con tus movimientos.</p>
          </div>
          <Link href="/" className="btn btn-ghost btn-sm">
            Volver al resumen
          </Link>
        </div>

        {error ? (
          <div className="alert">{error}</div>
        ) : null}

        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">Patrimonio actual</span>
            <span className="stat-value">{loading ? "—" : compactMoney(current?.final ?? 0)}</span>
            <span className="stat-foot">
              <span className={`trend ${(current?.variacion ?? 0) >= 0 ? "up" : "down"}`}>
                {signed(current?.variacion ?? 0, compactMoney)}
              </span>
              <span>en {monthLabel(current?.clave || currentKey)}</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Saldo inicial</span>
            <span className="stat-value">{compactMoney(base)}</span>
            <span className="stat-foot">Base de tu plantilla</span>
          </div>
          <div className="stat">
            <span className="stat-label">Mejor mes</span>
            <span className="stat-value">
              {loading ? "—" : signed(best?.variacion ?? 0, compactMoney)}
            </span>
            <span className="stat-foot">{best?.clave ? monthLabel(best.clave, true) : "—"}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Acumulado movimientos</span>
            <span className="stat-value">{loading ? "—" : signed(accumulated, compactMoney)}</span>
            <span className="stat-foot">Ingresos menos gastos</span>
          </div>
        </div>

        <section className="chart-box" style={{ marginTop: 18 }}>
          <div className="section-head" style={{ marginBottom: 4 }}>
            <div>
              <h3>Evolución del patrimonio</h3>
              <p className="chart-sub">
                El saldo final de cada mes. La base es {ars(base)}.
              </p>
            </div>
          </div>
          <PatrimonioChart rows={monthly} />
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <div className="section-head">
            <div>
              <h2>Regla 50 / 30 / 20 de {monthLabel(current?.clave || currentKey, true)}</h2>
              <p>Gasto real contra el objetivo calculado sobre tus ingresos.</p>
            </div>
          </div>

          <div className="grid-2" style={{ alignItems: "start" }}>
            <div>
              {budgets.map((item) => {
                const fill =
                  item.target > 0
                    ? Math.min((item.spent / item.target) * 100, 100)
                    : item.spent > 0
                      ? 100
                      : 0;
                return (
                  <div className="progress-item" key={item.label}>
                    <div className="progress-row">
                      <span>
                        {item.label}{" "}
                        <span className="muted" style={{ fontWeight: 700 }}>
                          ({item.targetPct})
                        </span>
                      </span>
                      <span>{ars(item.spent)}</span>
                    </div>
                    <div className={item.variant}>
                      <span style={{ width: `${fill}%` }} />
                    </div>
                    <div className="progress-meta">
                      <span>Objetivo {ars(item.target)}</span>
                      <span>
                        {current && current.ingresos > 0
                          ? pct((item.spent / current.ingresos) * 100)
                          : "Sin ingresos"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card-soft">
              <strong style={{ display: "block", marginBottom: 6 }}>
                Cómo se calcula
              </strong>
              <p className="muted" style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>
                El patrimonio inicial es el saldo con el que arranca tu plantilla.
                Cada mes suma los ingresos y resta los gastos para obtener el
                patrimonio final. Los objetivos 50/30/20 se calculan sobre los
                ingresos del mes.
              </p>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <div className="section-head">
            <div>
              <h2>Detalle mensual</h2>
              <p>{monthly.length} meses con seguimiento.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table-warm">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Patrimonio inicial</th>
                  <th>Ingresos</th>
                  <th>Gastos</th>
                  <th>Patrimonio final</th>
                  <th>Variación</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Cargando patrimonio…
                    </td>
                  </tr>
                ) : monthly.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Todavía no hay movimientos para calcular el patrimonio.
                    </td>
                  </tr>
                ) : (
                  monthly
                    .slice()
                    .reverse()
                    .map((row) => (
                      <tr key={row.clave}>
                        <td style={{ fontWeight: 900 }}>
                          {monthLabel(row.clave, true)}
                          {row.clave === current?.clave ? (
                            <span className="badge badge-necesidades" style={{ marginLeft: 8 }}>
                              actual
                            </span>
                          ) : null}
                        </td>
                        <td>{ars(row.inicial)}</td>
                        <td style={{ color: "var(--mint-ink)", fontWeight: 800 }}>
                          {ars(row.ingresos)}
                        </td>
                        <td style={{ color: "var(--brand-ink)", fontWeight: 800 }}>
                          {ars(row.gastos)}
                        </td>
                        <td style={{ fontWeight: 900 }}>{ars(row.final)}</td>
                        <td
                          style={{
                            fontWeight: 800,
                            color: row.variacion >= 0 ? "var(--mint-ink)" : "var(--brand-ink)",
                          }}
                        >
                          {signed(row.variacion, ars)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
