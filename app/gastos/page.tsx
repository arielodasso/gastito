"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/supabaseClient";
import TopNav from "@/app/components/TopNav";
import Modal from "@/app/components/Modal";
import { amountOf, monthKeyOf, type Gasto } from "@/app/lib/finance";
import { ars, compactMoney, shortDateLabel, todayKey } from "@/app/lib/format";

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
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

        <div className="section-head" style={{ marginTop: 26 }}>
          <div>
            <h2>Historial</h2>
            <p>{gastos.length} gastos registrados.</p>
          </div>
        </div>

        <div className="table-wrap table-history">
          <table className="table-warm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th className="col-optional-sm">Categoría</th>
                <th>50/30/20</th>
                <th>Monto</th>
                <th className="col-optional">Medio</th>
                <th className="col-optional">Fijo</th>
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
                    <td data-label="Fecha">{shortDateLabel(row.fecha)}</td>
                    <td data-label="Concepto" style={{ fontWeight: 800 }}>
                      {row.concepto}
                    </td>
                    <td data-label="Categoría" className="col-optional-sm">
                      {row.categoria}
                    </td>
                    <td data-label="50/30/20">
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
                    <td data-label="Monto" style={{ fontWeight: 800 }}>
                      {ars(amountOf(row))}
                      {row.moneda && row.moneda !== "ARS" ? (
                        <span className="muted" style={{ fontWeight: 600 }}>
                          {" "}
                          ({row.monto} {row.moneda})
                        </span>
                      ) : null}
                    </td>
                    <td data-label="Medio" className="col-optional">
                      {row.medio_pago}
                    </td>
                    <td data-label="Fijo" className="col-optional">
                      {row.fijo_variable}
                    </td>
                    <td className="cell-actions">
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
