"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/supabaseClient";
import TopNav from "@/app/components/TopNav";
import { amountOf, monthKeyOf, type Ingreso } from "@/app/lib/finance";
import { ars, compactMoney, dateLabel, todayKey } from "@/app/lib/format";

const EMPTY_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  cliente_fuente: "",
  tipo: "Freelance",
  proyecto: "",
  monto: "",
  moneda: "ARS",
  tipo_cambio_ars: "1",
  cobrado: "true",
  notas: "",
};

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const monto = Number(form.monto);
    if (!form.cliente_fuente.trim() || !Number.isFinite(monto) || monto <= 0) {
      setError("Completá el cliente y un monto mayor a cero.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    const { data, error: insertError } = await supabase
      .from("ingresos")
      .insert([
        {
          id: crypto.randomUUID(),
          fecha: form.fecha,
          cliente_fuente: form.cliente_fuente.trim(),
          tipo: form.tipo,
          proyecto: form.proyecto.trim() || null,
          monto,
          moneda: form.moneda,
          tipo_cambio_ars: Number(form.tipo_cambio_ars) || 1,
          cobrado: form.cobrado === "true",
          mes_clave: form.fecha.slice(0, 7),
          notas: form.notas.trim(),
          impacta_resultados: true,
        },
      ])
      .select("*")
      .single();

    if (insertError) {
      setError("No se pudo guardar el ingreso.");
    } else {
      setIngresos((rows) => [data as Ingreso, ...rows]);
      setForm({ ...EMPTY_FORM, fecha: form.fecha });
      setNotice("Ingreso guardado.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar este ingreso?")) return;
    const { error: deleteError } = await supabase.from("ingresos").delete().eq("id", id);
    if (deleteError) {
      setError("No se pudo eliminar el ingreso.");
      return;
    }
    setIngresos((rows) => rows.filter((row) => row.id !== id));
  }

  async function handleEditIngreso(id: string) {
    const newMonto = window.prompt("Nuevo monto:", "");
    if (newMonto === null) return;
    const num = Number(newMonto);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Monto inválido");
      return;
    }
    const { error } = await supabase.from("ingresos").update({ monto: num }).eq("id", id);
    if (error) {
      setError("No se pudo actualizar el ingreso.");
    } else {
      setIngresos((rows) => rows.map((r) => r.id === id ? { ...r, monto: num } as Ingreso : r));
    }
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

        <div className="grid-2" style={{ marginTop: 18, alignItems: "start" }}>
          <form className="card" onSubmit={handleSubmit}>
            <p className="form-section-title">Nuevo ingreso</p>
            <p className="form-section-sub">
              Cargá el cobro y listo. Podés dejarlo en USD y convertir a ARS.
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
                <label className="form-label" htmlFor="cliente">
                  Cliente / Fuente
                </label>
                <input
                  id="cliente"
                  className="input-warm"
                  placeholder="Ej: Marcelo, Hayas, Agustina"
                  value={form.cliente_fuente}
                  onChange={(event) =>
                    setForm({ ...form, cliente_fuente: event.target.value })
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="tipo">
                  Tipo
                </label>
                <select
                  id="tipo"
                  className="input-warm"
                  value={form.tipo}
                  onChange={(event) => setForm({ ...form, tipo: event.target.value })}
                >
                  <option>Freelance</option>
                  <option>Otro</option>
                  <option>Sigma Tecnologías</option>
                  <option>Sueldo</option>
                  <option>Inversión</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="proyecto">
                  Proyecto
                </label>
                <input
                  id="proyecto"
                  className="input-warm"
                  placeholder="Opcional"
                  value={form.proyecto}
                  onChange={(event) => setForm({ ...form, proyecto: event.target.value })}
                />
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
                <label className="form-label" htmlFor="cobrado">
                  Cobrado
                </label>
                <select
                  id="cobrado"
                  className="input-warm"
                  value={form.cobrado}
                  onChange={(event) => setForm({ ...form, cobrado: event.target.value })}
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-field span-2">
                <label className="form-label" htmlFor="notas">
                  Notas
                </label>
                <textarea
                  id="notas"
                  className="input-warm"
                  rows={2}
                  placeholder="Opcional"
                  value={form.notas}
                  onChange={(event) => setForm({ ...form, notas: event.target.value })}
                />
              </div>
            </div>

            <button className="btn-primary" type="submit" style={{ width: "100%", marginTop: 16 }} disabled={saving}>
              {saving ? "Guardando…" : "Registrar ingreso"}
            </button>
          </form>

          <div className="card">
            <p className="form-section-title">Atajos</p>
            <p className="form-section-sub">
              Para el día a día, la carga rápida entiende frases como “Cobra
              30000 de Marcelo”.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/carga-rapida" className="btn btn-primary">
                Carga rápida
              </Link>
              <Link href="/gastos" className="btn btn-ghost">
                Ir a gastos
              </Link>
              <Link href="/patrimonio" className="btn btn-ghost">
                Ver patrimonio
              </Link>
            </div>

            <div className="card-soft" style={{ marginTop: 16 }}>
              <strong style={{ display: "block", marginBottom: 4 }}>
                Cómo impacta
              </strong>
              <span className="muted" style={{ fontSize: 13.5, fontWeight: 600 }}>
                Cada ingreso suma al patrimonio y define los objetivos 50/30/20
                del mes en el resumen.
              </span>
            </div>
          </div>
        </div>

        <div className="section-head" style={{ marginTop: 26 }}>
          <div>
            <h2>Historial</h2>
            <p>{ingresos.length} ingresos registrados.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table-warm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente / Fuente</th>
                <th>Tipo</th>
                <th>Proyecto</th>
                <th>Monto</th>
                <th>Cobrado</th>
                <th>Notas</th>
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
                    <td>{dateLabel(row.fecha)}</td>
                    <td style={{ fontWeight: 800 }}>{row.cliente_fuente}</td>
                    <td>{row.tipo}</td>
                    <td>{row.proyecto || "—"}</td>
                    <td style={{ fontWeight: 800 }}>
                      {ars(amountOf(row))}
                      {row.moneda && row.moneda !== "ARS" ? (
                        <span className="muted" style={{ fontWeight: 600 }}>
                          {" "}
                          ({row.monto} {row.moneda})
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span className={row.cobrado ? "badge badge-ahorro" : "badge"}>
                        {row.cobrado ? "Sí" : "No"}
                      </span>
                    </td>
                    <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {row.notas || "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{display: 'flex', gap: 4, fontSize: 12, alignItems: 'center'}}>
                        <button className='btn btn-ghost btn-xs' aria-label="Eliminar" onClick={() => handleDelete(row.id)}>×</button>
                        <button className='btn btn-ghost btn-xs' aria-label="Editar" onClick={() => handleEditIngreso(row.id)}>✎</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
