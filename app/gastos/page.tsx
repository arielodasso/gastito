"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/supabaseClient";
import TopNav from "@/app/components/TopNav";
import Modal from "@/app/components/Modal";
import { amountOf, monthKeyOf, type Gasto } from "@/app/lib/finance";
import { ars, compactMoney, dateLabel, todayKey } from "@/app/lib/format";

const CATEGORIES = [
  "Ocio",
  "Comida (delivery/salidas)",
  "Comida (super)",
  "Transporte",
  "Herramientas de trabajo (SaaS)",
  "Celular",
  "Salud",
  "Tarjeta de crédito",
  "Monotributo/Impuestos",
  "Regalos",
  "Internet",
  "Obra social",
  "Ropa",
  "Ahorro",
  "Educación",
  "Servicios (luz/gas/agua)",
  "Alquiler",
  "Expensas",
  "Otros",
];

const EMPTY_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  concepto: "",
  categoria: "Ocio",
  tipo_503020: "Deseos",
  monto: "",
  moneda: "ARS",
  tipo_cambio_ars: "1",
  medio_pago: "Débito",
  fijo_variable: "Variable",
  impacta_resultados: "true",
};

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    concepto: string;
    monto: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Gasto | null>(null);
  const [working, setWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("gastos")
      .select(
        "id,fecha,concepto,categoria,tipo_503020,monto,moneda,monto_ars,medio_pago,fijo_variable"
      )
      .order("fecha", { ascending: false });
    if (loadError) {
      setError("No pudimos cargar los gastos.");
    } else {
      setGastos((data as Gasto[]) || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const total = useMemo(
    () => gastos.reduce((sum, row) => sum + amountOf(row), 0),
    [gastos]
  );
  const currentMonth = todayKey();
  const monthGastos = useMemo(
    () => gastos.filter((row) => monthKeyOf(row.fecha) === currentMonth),
    [gastos, currentMonth]
  );
  const monthTotal = monthGastos.reduce((sum, row) => sum + amountOf(row), 0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const monto = Number(form.monto);
    if (!form.concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      setError("Completá el concepto y un monto mayor a cero.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const { data, error: insertError } = await supabase
      .from("gastos")
      .insert([
        {
          id: crypto.randomUUID(),
          fecha: form.fecha,
          concepto: form.concepto.trim(),
          categoria: form.categoria,
          tipo_503020: form.tipo_503020,
          monto,
          moneda: form.moneda,
          tipo_cambio_ars: Number(form.tipo_cambio_ars) || 1,
          medio_pago: form.medio_pago,
          fijo_variable: form.fijo_variable,
          mes_clave: form.fecha.slice(0, 7),
          impacta_resultados: form.impacta_resultados === "true",
        },
      ])
      .select("*")
      .single();

    if (insertError) {
      setError("No se pudo guardar el gasto.");
    } else {
      setGastos((rows) => [data as Gasto, ...rows]);
      setForm({ ...EMPTY_FORM, fecha: form.fecha });
      setNotice("Gasto guardado.");
    }
    setSaving(false);
  }

  function handleDelete(row: Gasto) {
    setDialogError(null);
    setPendingDelete(row);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setWorking(true);
    const { error: deleteError } = await supabase
      .from("gastos")
      .delete()
      .eq("id", pendingDelete.id);
    setWorking(false);
    if (deleteError) {
      setDialogError("No se pudo eliminar el gasto.");
      return;
    }
    setGastos((rows) => rows.filter((row) => row.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  function handleEditGasto(row: Gasto) {
    setDialogError(null);
    setEditing({
      id: row.id,
      concepto: row.concepto || "",
      monto: String(row.monto),
    });
  }

  async function saveEditGasto() {
    if (!editing) return;
    const monto = Number(editing.monto);
    if (!editing.concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      setDialogError("Completá el concepto y un monto mayor a cero.");
      return;
    }
    setWorking(true);
    const { error: updateError } = await supabase
      .from("gastos")
      .update({ concepto: editing.concepto.trim(), monto })
      .eq("id", editing.id);
    setWorking(false);
    if (updateError) {
      setDialogError("No se pudo actualizar el gasto.");
      return;
    }
    setGastos((rows) =>
      rows.map((row) =>
        row.id === editing.id
          ? { ...row, concepto: editing.concepto.trim(), monto }
          : row
      )
    );
    setEditing(null);
    setNotice("Gasto actualizado.");
  }

  return (
    <>
      <TopNav />
      <main className="container page">
        <div className="section-head">
          <div>
            <span className="kicker">Gastos</span>
            <h2>Todo lo que sale</h2>
            <p>Registrá cada gasto y clasificalo para que el 50/30/20 cierre.</p>
          </div>
          <Link href="/" className="btn btn-ghost btn-sm">
            Volver al resumen
          </Link>
        </div>

        <div
          className="stat-grid"
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        >
          <div className="stat">
            <span className="stat-label">Total histórico</span>
            <span className="stat-value">{compactMoney(total)}</span>
            <span className="stat-foot">{gastos.length} movimientos</span>
          </div>
          <div className="stat">
            <span className="stat-label">Este mes</span>
            <span className="stat-value">{compactMoney(monthTotal)}</span>
            <span className="stat-foot">{monthGastos.length} movimientos</span>
          </div>
          <div className="stat">
            <span className="stat-label">Promedio por movimiento</span>
            <span className="stat-value">
              {compactMoney(gastos.length ? total / gastos.length : 0)}
            </span>
            <span className="stat-foot">En ARS</span>
          </div>
        </div>

        {error ? (
          <div className="alert" style={{ marginTop: 18 }}>
            {error}
            <button className="btn-accent" type="button" onClick={load}>
              Reintentar
            </button>
          </div>
        ) : null}
        {notice ? (
          <div className="alert" style={{ marginTop: 18, color: "var(--mint-ink)", background: "#e7f8f1", borderColor: "#bcebd9" }}>
            {notice}
          </div>
        ) : null}

        <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}>
          <form className="card" onSubmit={handleSubmit}>
            <p className="form-section-title">Nuevo gasto</p>
            <p className="form-section-sub">
              Elegí el tipo 50/30/20 para que el panel sepa dónde ubicarlo.
            </p>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="fecha">
                  Fecha
                </label>
                <input
                  id="fecha"
                  type="date"
                  className="input-warm"
                  value={form.fecha}
                  onChange={(event) => setForm({ ...form, fecha: event.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="concepto">
                  Concepto
                </label>
                <input
                  id="concepto"
                  className="input-warm"
                  placeholder="Ej: Sushi con amigos"
                  value={form.concepto}
                  onChange={(event) => setForm({ ...form, concepto: event.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="categoria">
                  Categoría
                </label>
                <select
                  id="categoria"
                  className="input-warm"
                  value={form.categoria}
                  onChange={(event) => setForm({ ...form, categoria: event.target.value })}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="tipo">
                  Tipo 50/30/20
                </label>
                <select
                  id="tipo"
                  className="input-warm"
                  value={form.tipo_503020}
                  onChange={(event) =>
                    setForm({ ...form, tipo_503020: event.target.value })
                  }
                >
                  <option>Necesidades</option>
                  <option>Deseos</option>
                  <option>Ahorro</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="monto">
                  Monto
                </label>
                <input
                  id="monto"
                  type="number"
                  min="0"
                  step="0.01"
                  className="input-warm"
                  placeholder="0"
                  value={form.monto}
                  onChange={(event) => setForm({ ...form, monto: event.target.value })}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="moneda">
                  Moneda
                </label>
                <select
                  id="moneda"
                  className="input-warm"
                  value={form.moneda}
                  onChange={(event) => setForm({ ...form, moneda: event.target.value })}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="cambio">
                  Tipo de cambio a ARS
                </label>
                <input
                  id="cambio"
                  type="number"
                  min="0"
                  step="0.0001"
                  className="input-warm"
                  value={form.tipo_cambio_ars}
                  onChange={(event) =>
                    setForm({ ...form, tipo_cambio_ars: event.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="medio">
                  Medio de pago
                </label>
                <select
                  id="medio"
                  className="input-warm"
                  value={form.medio_pago}
                  onChange={(event) => setForm({ ...form, medio_pago: event.target.value })}
                >
                  <option>Efectivo</option>
                  <option>Débito</option>
                  <option>Transferencia</option>
                  <option>Tarjeta Crédito</option>
                  <option>Cheque</option>
                  <option>Otro</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="fijo">
                  Fijo / Variable
                </label>
                <select
                  id="fijo"
                  className="input-warm"
                  value={form.fijo_variable}
                  onChange={(event) =>
                    setForm({ ...form, fijo_variable: event.target.value })
                  }
                >
                  <option>Fijo</option>
                  <option>Variable</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="impacta">
                  Impacta resultados
                </label>
                <select
                  id="impacta"
                  className="input-warm"
                  value={form.impacta_resultados}
                  onChange={(event) =>
                    setForm({ ...form, impacta_resultados: event.target.value })
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <button className="btn-primary" type="submit" style={{ width: "100%", marginTop: 16 }} disabled={saving}>
              {saving ? "Guardando…" : "Registrar gasto"}
            </button>
          </form>

          <div className="card">
            <p className="form-section-title">Atajos</p>
            <p className="form-section-sub">
              Lo más rápido: “Gasti 4500 en muzzarella en efectivo” y que el
              sistema clasifique todo.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/carga-rapida" className="btn btn-primary">
                Carga rápida
              </Link>
              <Link href="/ingresos" className="btn btn-ghost">
                Ir a ingresos
              </Link>
              <Link href="/patrimonio" className="btn btn-ghost">
                Ver patrimonio
              </Link>
            </div>

            <div className="card-soft" style={{ marginTop: 16 }}>
              <strong style={{ display: "block", marginBottom: 4 }}>
                Categorías del Excel
              </strong>
              <span className="muted" style={{ fontSize: 13.5, fontWeight: 600 }}>
                Se mantienen las categorías originales de tu plantilla para que
                los números coincidan.
              </span>
            </div>
          </div>
        </div>

        <div className="section-head" style={{ marginTop: 26 }}>
          <div>
            <h2>Historial</h2>
            <p>{gastos.length} gastos registrados.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table-warm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>50/30/20</th>
                <th>Monto</th>
                <th>Medio</th>
                <th>Fijo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty">
                    Cargando gastos…
                  </td>
                </tr>
              ) : gastos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    Todavía no hay gastos.
                  </td>
                </tr>
              ) : (
                gastos.map((row) => (
                  <tr key={row.id}>
                    <td>{dateLabel(row.fecha)}</td>
                    <td style={{ fontWeight: 800 }}>{row.concepto}</td>
                    <td>{row.categoria}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.tipo_503020 === "Necesidades"
                            ? "badge-necesidades"
                            : row.tipo_503020 === "Ahorro"
                              ? "badge-ahorro"
                              : "badge-deseos"
                        }`}
                      >
                        {row.tipo_503020}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800 }}>
                      {ars(amountOf(row))}
                      {row.moneda && row.moneda !== "ARS" ? (
                        <span className="muted" style={{ fontWeight: 600 }}>
                          {" "}
                          ({row.monto} {row.moneda})
                        </span>
                      ) : null}
                    </td>
                    <td>{row.medio_pago}</td>
                    <td>{row.fijo_variable}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{display: 'flex', gap: 4, fontSize: 12, alignItems: 'center'}}>
                        <button className='btn btn-ghost btn-xs' aria-label="Eliminar" onClick={() => handleDelete(row)}>×</button>
                        <button className='btn btn-ghost btn-xs' aria-label="Editar" onClick={() => handleEditGasto(row)}>✎</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Modal
          open={!!editing}
          title="Editar gasto"
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
                onClick={saveEditGasto}
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
                <label className="form-label" htmlFor="edit-concepto">
                  Concepto
                </label>
                <input
                  id="edit-concepto"
                  className="input-warm"
                  value={editing.concepto}
                  onChange={(event) =>
                    setEditing({ ...editing, concepto: event.target.value })
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
          title="Eliminar gasto"
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
                ¿Eliminar el gasto{" "}
                <strong>{pendingDelete.concepto || "este registro"}</strong> por{" "}
                <strong>{ars(amountOf(pendingDelete))}</strong>? Esta acción no se
                puede deshacer.
              </p>
            </>
          ) : null}
        </Modal>
      </main>
    </>
  );
}
