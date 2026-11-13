"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/supabaseClient";
import TopNav from "@/app/components/TopNav";
import Modal from "@/app/components/Modal";
import QuickRegister from "@/app/components/QuickRegister";
import { FlujoBars, PatrimonioChart } from "@/app/components/Charts";
import {
  buildMonthly,
  buildMovements,
  monthKeyOf,
  topCategories,
  RULE,
  type Gasto,
  type Ingreso,
  type Movimiento,
} from "@/app/lib/finance";
import {
  ars,
  compactMoney,
  dateLabel,
  monthLabel,
  pct,
  signed,
  todayKey,
} from "@/app/lib/format";

export default function Dashboard() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    movement: Movimiento;
    titulo: string;
    monto: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Movimiento | null>(null);
  const [working, setWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [incomeResult, expenseResult] = await Promise.all([
        supabase
          .from("ingresos")
          .select(
            "id,fecha,cliente_fuente,tipo,proyecto,monto,moneda,monto_ars,cobrado,notas"
          )
          .order("fecha", { ascending: false }),
        supabase
          .from("gastos")
          .select(
            "id,fecha,concepto,categoria,tipo_503020,monto,moneda,monto_ars,medio_pago,fijo_variable"
          )
          .order("fecha", { ascending: false }),
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (expenseResult.error) throw expenseResult.error;

      setError(null);
      setIngresos((incomeResult.data as Ingreso[]) || []);
      setGastos((expenseResult.data as Gasto[]) || []);
    } catch (err) {
      console.error("Error cargando el panel:", err);
      setError("No pudimos cargar tus datos. Reintentá en un momento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function handleDelete(mov: Movimiento) {
    setDialogError(null);
    setPendingDelete(mov);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const table = pendingDelete.tipo === "ingreso" ? "ingresos" : "gastos";
    setWorking(true);
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq("id", pendingDelete.id);
    setWorking(false);
    if (deleteError) {
      setDialogError(`No se pudo eliminar el ${pendingDelete.tipo}.`);
      return;
    }
    setPendingDelete(null);
    load();
  }

  function handleEditStart(mov: Movimiento) {
    setDialogError(null);
    setEditing({ movement: mov, titulo: mov.titulo || "", monto: String(mov.monto) });
  }

  async function handleEditSave() {
    if (!editing) return;
    const monto = Number(editing.monto);
    if (!editing.titulo.trim() || !Number.isFinite(monto) || monto <= 0) {
      setDialogError("Completá la descripción y un monto mayor a cero.");
      return;
    }
    const table = editing.movement.tipo === "ingreso" ? "ingresos" : "gastos";
    const field = editing.movement.tipo === "ingreso" ? "cliente_fuente" : "concepto";
    setWorking(true);
    const { error: updateError } = await supabase
      .from(table)
      .update({ [field]: editing.titulo.trim(), monto })
      .eq("id", editing.movement.id);
    setWorking(false);
    if (updateError) {
      setDialogError(`No se pudo actualizar el ${editing.movement.tipo}.`);
      return;
    }
    setEditing(null);
    load();
  }

  const monthly = useMemo(() => buildMonthly(ingresos, gastos), [ingresos, gastos]);
  const currentKey = todayKey();
  const currentIndex = monthly.findIndex((row) => row.clave === currentKey);
  const current = currentIndex >= 0 ? monthly[currentIndex] : monthly[monthly.length - 1];
  const previous = currentIndex > 0 ? monthly[currentIndex - 1] : undefined;
  const movements = useMemo(
    () => buildMovements(ingresos, gastos).slice(0, 9),
    [ingresos, gastos]
  );
  const categories = useMemo(
    () => topCategories(gastos, current?.clave || "", 5),
    [gastos, current?.clave]
  );

  const ingresosMes = current?.ingresos ?? 0;
  const gastosMes = current?.gastos ?? 0;
  const patrimonio = current?.final ?? 0;
  const balance = ingresosMes - gastosMes;
  const variation = current?.variacion ?? 0;
  const monthIngresosCount = ingresos.filter(
    (row) => monthKeyOf(row.fecha) === current?.clave
  ).length;
  const monthGastosCount = gastos.filter(
    (row) => monthKeyOf(row.fecha) === current?.clave
  ).length;

  const budgets = [
    {
      label: "Necesidades",
      targetPct: "50%",
      spent: current?.necesidades ?? 0,
      target: ingresosMes * RULE.necesidades,
      variant: "progress",
    },
    {
      label: "Deseos",
      targetPct: "30%",
      spent: current?.deseos ?? 0,
      target: ingresosMes * RULE.deseos,
      variant: "progress sky",
    },
    {
      label: "Ahorro / Inversión",
      targetPct: "20%",
      spent: current?.ahorro ?? 0,
      target: ingresosMes * RULE.ahorro,
      variant: "progress mint",
    },
  ];

  const maxCategory = categories.length > 0 ? categories[0].monto : 1;

  return (
    <>
      <TopNav />
      <main className="container page">
        <section className="hero">
          <div className="hero-grid">
            <div>
              <QuickRegister onSaved={load} />
            </div>

            <aside
              className="card"
              style={{
                background:
                  "linear-gradient(155deg, #ffffff 0%, #ffffff 52%, #fdebe7 100%)",
                padding: 26,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span className="badge badge-necesidades">
                  {monthLabel(current?.clave || currentKey, true)}
                </span>
                <span
                  className={`trend ${variation >= 0 ? "up" : "down"}`}
                  title="Variación del patrimonio en el mes"
                >
                  {variation >= 0 ? "▲" : "▼"} {signed(variation, compactMoney)}
                </span>
              </div>

              <p className="stat-label" style={{ marginTop: 22 }}>
                Patrimonio al cierre
              </p>
              <p
                style={{
                  margin: "4px 0 2px",
                  fontSize: "clamp(32px, 4.2vw, 44px)",
                  fontWeight: 900,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.05,
                }}
              >
                {compactMoney(patrimonio)}
              </p>
              <p className="muted" style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
                {previous
                  ? `Venís de ${compactMoney(previous.final)} en ${monthLabel(
                      previous.clave
                    )}`
                  : "Punto de partida de tu plantilla"}
              </p>

              <div className="divider" />

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span className="soft" style={{ fontWeight: 700 }}>
                    Ingresos
                  </span>
                  <strong>{compactMoney(ingresosMes)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span className="soft" style={{ fontWeight: 700 }}>
                    Gastos
                  </span>
                  <strong>{compactMoney(gastosMes)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span className="soft" style={{ fontWeight: 700 }}>
                    Balance del mes
                  </span>
                  <strong style={{ color: balance >= 0 ? "var(--mint-ink)" : "var(--brand-ink)" }}>
                    {signed(balance, compactMoney)}
                  </strong>
                </div>
              </div>

              <Link
                href="/patrimonio"
                className="btn btn-ghost btn-sm"
                style={{ width: "100%", marginTop: 18 }}
              >
                Ver evolución completa
              </Link>
            </aside>
          </div>
        </section>

        {error ? (
          <div className="alert" style={{ marginBottom: 20 }}>
            {error}
            <button className="btn-accent" onClick={load} type="button">
              Reintentar
            </button>
          </div>
        ) : null}

        <section className="stat-grid" aria-label="Indicadores del mes">
          <div className="stat">
            <span className="stat-label">Ingresos del mes</span>
            <span className="stat-value">{loading ? "—" : compactMoney(ingresosMes)}</span>
            <span className="stat-foot">
              <span className="trend up">{monthIngresosCount} mov.</span>
              {previous ? (
                <span>{`vs. ${monthLabel(previous.clave)}: ${compactMoney(
                  previous.ingresos
                )}`}</span>
              ) : null}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">Gastos del mes</span>
            <span className="stat-value">{loading ? "—" : compactMoney(gastosMes)}</span>
            <span className="stat-foot">
              <span className="trend down">{monthGastosCount} mov.</span>
              {previous ? (
                <span>{`vs. ${monthLabel(previous.clave)}: ${compactMoney(
                  previous.gastos
                )}`}</span>
              ) : null}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">Balance del mes</span>
            <span className="stat-value">{loading ? "—" : signed(balance, compactMoney)}</span>
            <span className="stat-foot">
              <span className={`trend ${balance >= 0 ? "up" : "down"}`}>
                {balance >= 0 ? "Superávit" : "Déficit"}
              </span>
              <span>
                {ingresosMes > 0 ? pct((balance / ingresosMes) * 100) : "Sin ingresos"}
              </span>
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">Patrimonio actual</span>
            <span className="stat-value">{loading ? "—" : compactMoney(patrimonio)}</span>
            <span className="stat-foot">
              <span className={`trend ${variation >= 0 ? "up" : "down"}`}>
                {signed(variation, compactMoney)}
              </span>
              <span>en el mes</span>
            </span>
          </div>
        </section>

        <section className="grid-2" style={{ marginTop: 18 }}>
          <div className="chart-box">
            <div className="section-head" style={{ marginBottom: 4 }}>
              <div>
                <h3>Evolución del patrimonio</h3>
                <p className="chart-sub">Cierre estimado de cada mes de tu plantilla.</p>
              </div>
              <span className="badge badge-ahorro">2026</span>
            </div>
            <PatrimonioChart rows={monthly} />
          </div>

          <div className="chart-box">
            <div className="section-head" style={{ marginBottom: 4 }}>
              <div>
                <h3>Flujo mensual</h3>
                <p className="chart-sub">Ingresos y gastos de los últimos meses.</p>
              </div>
            </div>
            <FlujoBars rows={monthly} />
          </div>
        </section>

        <section className="grid-2" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="section-head">
              <div>
                <h2>Regla 50 / 30 / 20</h2>
                <p>Cómo se reparte el ingreso de {monthLabel(current?.clave || currentKey, true)}.</p>
              </div>
            </div>

            {ingresosMes === 0 ? (
              <div className="card-soft" style={{ marginBottom: 18 }}>
                <strong style={{ display: "block", marginBottom: 2 }}>
                  Todavía no hay ingresos este mes
                </strong>
                <span className="muted" style={{ fontSize: 13.5 }}>
                  Igual mostramos tus gastos para que veas cómo venís. Cargá un
                  ingreso y los objetivos se calculan solos.
                </span>
              </div>
            ) : null}

            {budgets.map((item) => {
              const share = ingresosMes > 0 ? (item.spent / ingresosMes) * 100 : 0;
              const fill =
                item.target > 0 ? Math.min((item.spent / item.target) * 100, 100) : 0;
              const rest = item.target - item.spent;
              return (
                <div className="progress-item" key={item.label}>
                  <div className="progress-row">
                    <span>
                      {item.label}{" "}
                      <span className="muted" style={{ fontWeight: 700 }}>
                        ({item.targetPct})
                      </span>
                    </span>
                    <span className="pct">
                      {ars(item.spent)}
                      {item.target > 0 ? (
                        <span className="muted" style={{ fontWeight: 700 }}>
                          {" "}
                          / {ars(item.target)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className={item.variant}>
                    <span style={{ width: `${fill}%` }} />
                  </div>
                  <div className="progress-meta">
                    <span>
                      {ingresosMes > 0 ? `${pct(share)} del ingreso` : "Sin objetivo este mes"}
                    </span>
                    <span
                      style={{
                        color: ingresosMes === 0 ? "var(--muted)" : rest < 0 ? "var(--brand-ink)" : undefined,
                      }}
                    >
                      {ingresosMes === 0
                        ? `Gastado ${ars(item.spent)}`
                        : rest < 0
                          ? `Excedido ${ars(Math.abs(rest))}`
                          : `Disponible ${ars(rest)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="section-head">
              <div>
                <h2>Dónde se fue la plata</h2>
                <p>Top categorías de {monthLabel(current?.clave || currentKey)}.</p>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="empty">Sin gastos registrados este mes.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {categories.map((item) => (
                  <div key={item.categoria}>
                    <div className="progress-row" style={{ marginBottom: 4 }}>
                      <span>{item.categoria}</span>
                      <span>{ars(item.monto)}</span>
                    </div>
                    <div className="progress">
                      <span
                        style={{
                          width: `${Math.max((item.monto / maxCategory) * 100, 4)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/gastos"
              className="btn btn-ghost btn-sm"
              style={{ width: "100%", marginTop: 18 }}
            >
              Ver todos los gastos
            </Link>
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <div className="section-head">
            <div>
              <h2>Evolución mensual</h2>
              <p>El mismo seguimiento de patrimonio de tu Excel, mes a mes.</p>
            </div>
            <Link href="/patrimonio" className="btn btn-ghost btn-sm">
              Abrir patrimonio
            </Link>
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
                {monthly
                  .slice()
                  .reverse()
                  .map((row) => {
                    const active = row.clave === current?.clave;
                    return (
                      <tr key={row.clave}>
                        <td style={{ fontWeight: 900 }}>
                          {monthLabel(row.clave, true)}
                          {active ? (
                            <span
                              className="badge badge-necesidades"
                              style={{ marginLeft: 8 }}
                            >
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
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid-2" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="section-head">
              <div>
                <h2>Últimos movimientos</h2>
                <p>Lo más reciente de tu plantilla.</p>
              </div>
              <Link href="/carga-rapida" className="btn btn-ghost btn-sm">
                Cargar
              </Link>
            </div>

            {movements.length === 0 ? (
              <div className="empty">Todavía no hay movimientos.</div>
            ) : (
              <div>
                {movements.map((movement) => (
                  <div className="movement" key={`${movement.tipo}-${movement.id}`}>
                    <div className={`movement-icon ${movement.tipo}`}>
                      {movement.tipo === "ingreso" ? "↑" : "↓"}
                    </div>
                    <div className="movement-main">
                      <div className="movement-title">{movement.titulo}</div>
                      <div className="movement-sub">
                        {dateLabel(movement.fecha)}
                        {movement.detalle ? ` · ${movement.detalle}` : ""}
                      </div>
                    </div>
                    <div className={`movement-amount ${movement.tipo}`}>
                      {movement.tipo === "ingreso" ? "+" : "−"} {ars(movement.monto)}
                    </div>
                    <div className="movement-meta">
                      {movement.tipo503020 ? (
                        <span
                          className={`badge movement-badge ${
                            movement.tipo503020 === "Necesidades"
                              ? "badge-necesidades"
                              : movement.tipo503020 === "Ahorro"
                                ? "badge-ahorro"
                                : "badge-deseos"
                          }`}
                        >
                          {movement.tipo503020}
                        </span>
                      ) : null}
                    </div>
                    <div className="movement-actions">
                      <button
                        className="btn btn-ghost btn-xs"
                        aria-label="Editar"
                        onClick={() => handleEditStart(movement)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn btn-ghost btn-xs"
                        aria-label="Eliminar"
                        onClick={() => handleDelete(movement)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-head">
              <div>
                <h2>Cargar y revisar</h2>
                <p>Todo lo que necesitás para seguir al día.</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/carga-rapida" className="btn btn-primary" style={{ width: "100%" }}>
                Carga rápida por texto o voz
              </Link>
              <Link href="/ingresos" className="btn btn-ghost" style={{ width: "100%" }}>
                Registrar ingreso
              </Link>
              <Link href="/gastos" className="btn btn-ghost" style={{ width: "100%" }}>
                Registrar gasto
              </Link>
              <Link href="/patrimonio" className="btn btn-ghost" style={{ width: "100%" }}>
                Revisar patrimonio
              </Link>
            </div>

            <div className="card-soft" style={{ marginTop: 16 }}>
              <strong style={{ display: "block", marginBottom: 4 }}>
                Tip de carga
              </strong>
              <span className="muted" style={{ fontSize: 13.5, fontWeight: 600 }}>
                Escribí “Gasti 4500 en muzzarella en efectivo” y el sistema detecta
                monto, medio de pago y categoría 50/30/20.
              </span>
            </div>
          </div>
        </section>

        <Modal
          open={!!editing}
          title={editing?.movement.tipo === "ingreso" ? "Editar ingreso" : "Editar gasto"}
          onClose={() => {
            setEditing(null);
            setDialogError(null);
          }}
          footer={
            <>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDialogError(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleEditSave}
                disabled={working}
              >
                {working ? "Guardando…" : "Guardar cambios"}
              </button>
            </>
          }
        >
          {editing ? (
            <>
              {dialogError ? <div className="alert">{dialogError}</div> : null}
              <div className="form-field">
                <label className="form-label" htmlFor="edit-titulo">
                  {editing.movement.tipo === "ingreso" ? "Cliente / Fuente" : "Concepto"}
                </label>
                <input
                  id="edit-titulo"
                  className="input-warm"
                  value={editing.titulo}
                  onChange={(event) =>
                    setEditing({ ...editing, titulo: event.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="edit-monto">
                  Monto
                </label>
                <input
                  id="edit-monto"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-warm"
                  value={editing.monto}
                  onChange={(event) =>
                    setEditing({ ...editing, monto: event.target.value })
                  }
                />
              </div>
            </>
          ) : null}
        </Modal>

        <Modal
          open={!!pendingDelete}
          title={pendingDelete?.tipo === "ingreso" ? "Eliminar ingreso" : "Eliminar gasto"}
          onClose={() => {
            setPendingDelete(null);
            setDialogError(null);
          }}
          footer={
            <>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setPendingDelete(null);
                  setDialogError(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary modal-danger"
                type="button"
                onClick={confirmDelete}
                disabled={working}
              >
                {working ? "Eliminando…" : "Eliminar"}
              </button>
            </>
          }
        >
          {pendingDelete ? (
            <>
              {dialogError ? <div className="alert">{dialogError}</div> : null}
              <p>
                ¿Eliminar <strong>{pendingDelete.titulo || "este registro"}</strong>{" "}
                por <strong>{ars(pendingDelete.monto)}</strong>? Esta acción no se
                puede deshacer.
              </p>
            </>
          ) : null}
        </Modal>
      </main>
    </>
  );
}
