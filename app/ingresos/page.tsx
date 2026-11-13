"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/supabaseClient";
import TopNav from "@/app/components/TopNav";
import Modal from "@/app/components/Modal";
import { amountOf, monthKeyOf, type Ingreso } from "@/app/lib/finance";
import { ars, compactMoney, shortDateLabel, todayKey } from "@/app/lib/format";

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    cliente: string;
    monto: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Ingreso | null>(null);
  const [working, setWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("ingresos")
      .select(
        "id,fecha,cliente_fuente,tipo,proyecto,monto,moneda,monto_ars,cobrado,notas"
      )
      .order("fecha", { ascending: false });
    if (loadError) {
      setError("No pudimos cargar los ingresos.");
    } else {
      setIngresos((data as Ingreso[]) || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const total = useMemo(
    () => ingresos.reduce((sum, row) => sum + amountOf(row), 0),
    [ingresos]
  );
  const currentMonth = todayKey();
  const monthTotal = useMemo(
    () =>
      ingresos
        .filter((row) => monthKeyOf(row.fecha) === currentMonth)
        .reduce((sum, row) => sum + amountOf(row), 0),
    [ingresos, currentMonth]
  );

  function handleDelete(row: Ingreso) {
    setDialogError(null);
    setPendingDelete(row);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setWorking(true);
    const { error: deleteError } = await supabase
      .from("ingresos")
      .delete()
      .eq("id", pendingDelete.id);
    setWorking(false);
    if (deleteError) {
      setDialogError("No se pudo eliminar el ingreso.");
      return;
    }
    setIngresos((rows) => rows.filter((row) => row.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  function handleEditIngreso(row: Ingreso) {
    setDialogError(null);
    setEditing({
      id: row.id,
      cliente: row.cliente_fuente || "",
      monto: String(row.monto),
    });
  }

  async function saveEditIngreso() {
    if (!editing) return;
    const monto = Number(editing.monto);
    if (!editing.cliente.trim() || !Number.isFinite(monto) || monto <= 0) {
      setDialogError("Completá el cliente y un monto mayor a cero.");
      return;
    }
    setWorking(true);
    const { error: updateError } = await supabase
      .from("ingresos")
      .update({ cliente_fuente: editing.cliente.trim(), monto })
      .eq("id", editing.id);
    setWorking(false);
    if (updateError) {
      setDialogError("No se pudo actualizar el ingreso.");
      return;
    }
    setIngresos((rows) =>
      rows.map((row) =>
        row.id === editing.id
          ? { ...row, cliente_fuente: editing.cliente.trim(), monto }
          : row
      )
    );
    setEditing(null);
    setNotice("Ingreso actualizado.");
  }

  return (
    <>
      <TopNav />
      <main className="container page">
        <div className="section-head">
          <div>
            <span className="kicker">Ingresos</span>
            <h2>Todo lo que entra</h2>
            <p>Registrá cobros y freelances. El panel recalcula el 50/30/20 solo.</p>
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
            <span className="stat-foot">{ingresos.length} movimientos</span>
          </div>
          <div className="stat">
            <span className="stat-label">Este mes</span>
            <span className="stat-value">{compactMoney(monthTotal)}</span>
            <span className="stat-foot">
              {ingresos.filter((row) => monthKeyOf(row.fecha) === currentMonth).length} movimientos
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Promedio por movimiento</span>
            <span className="stat-value">
              {compactMoney(ingresos.length ? total / ingresos.length : 0)}
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
            <p>{ingresos.length} ingresos registrados.</p>
          </div>
        </div>

        <div className="table-wrap table-history table-ingresos">
          <table className="table-warm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente / Fuente</th>
                <th className="col-optional-sm">Tipo</th>
                <th className="col-optional">Proyecto</th>
                <th>Monto</th>
                <th>Cobrado</th>
                <th className="col-optional">Notas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty">
                    Cargando ingresos…
                  </td>
                </tr>
              ) : ingresos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    Todavía no hay ingresos.
                  </td>
                </tr>
              ) : (
                ingresos.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Fecha">{shortDateLabel(row.fecha)}</td>
                    <td data-label="Cliente" title={row.cliente_fuente ?? undefined} style={{ fontWeight: 800 }}>
                      {row.cliente_fuente}
                    </td>
                    <td data-label="Tipo" className="col-optional-sm" title={row.tipo ?? undefined}>
                      {row.tipo}
                    </td>
                    <td data-label="Proyecto" className="col-optional" title={row.proyecto || undefined}>
                      {row.proyecto || "—"}
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
                    <td data-label="Cobrado">
                      <span className={row.cobrado ? "badge badge-ahorro" : "badge"}>
                        {row.cobrado ? "Sí" : "No"}
                      </span>
                    </td>
                    <td
                      data-label="Notas"
                      className="col-optional"
                      title={row.notas || undefined}
                    >
                      {row.notas || "—"}
                    </td>
                    <td className="cell-actions">
                      <div style={{display: 'flex', gap: 4, fontSize: 12, alignItems: 'center'}}>
                        <button className='btn btn-ghost btn-xs' aria-label="Eliminar" onClick={() => handleDelete(row)}>×</button>
                        <button className='btn btn-ghost btn-xs' aria-label="Editar" onClick={() => handleEditIngreso(row)}>✎</button>
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
          title="Editar ingreso"
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
                onClick={saveEditIngreso}
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
                <label className="form-label" htmlFor="edit-cliente">
                  Cliente / Fuente
                </label>
                <input
                  id="edit-cliente"
                  className="input-warm"
                  value={editing.cliente}
                  onChange={(event) =>
                    setEditing({ ...editing, cliente: event.target.value })
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
          title="Eliminar ingreso"
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
                ¿Eliminar el ingreso de{" "}
                <strong>{pendingDelete.cliente_fuente || "este registro"}</strong>{" "}
                por <strong>{ars(amountOf(pendingDelete))}</strong>? Esta acción no
                se puede deshacer.
              </p>
            </>
          ) : null}
        </Modal>
      </main>
    </>
  );
}
