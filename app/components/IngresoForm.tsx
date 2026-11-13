"use client";

import { useState } from "react";
import { supabase } from "@/src/supabaseClient";
import type { Ingreso } from "@/app/lib/finance";

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

type FormValues = typeof EMPTY_FORM;

interface Props {
  initial?: Partial<FormValues>;
  onSaved?: (row: Ingreso) => void;
  onCancel?: () => void;
}

export default function IngresoForm({ initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormValues>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const monto = Number(form.monto);
    if (!form.cliente_fuente.trim() || !Number.isFinite(monto) || monto <= 0) {
      setError("Completá el cliente y un monto mayor a cero.");
      return;
    }

    setSaving(true);
    setError(null);

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

    setSaving(false);

    if (insertError) {
      setError("No se pudo guardar el ingreso.");
      return;
    }

    setForm({ ...EMPTY_FORM, fecha: form.fecha });
    onSaved?.(data as Ingreso);
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <div className="alert" style={{ marginBottom: 14 }}>{error}</div> : null}

      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="ing-fecha">
            Fecha
          </label>
          <input
            id="ing-fecha"
            type="date"
            className="input-warm"
            value={form.fecha}
            onChange={(event) => setForm({ ...form, fecha: event.target.value })}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="ing-cliente">
            Cliente / Fuente
          </label>
          <input
            id="ing-cliente"
            className="input-warm"
            placeholder="Ej: Marcelo, Hayas, Agustina"
            value={form.cliente_fuente}
            onChange={(event) =>
              setForm({ ...form, cliente_fuente: event.target.value })
            }
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="ing-tipo">
            Tipo
          </label>
          <select
            id="ing-tipo"
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
          <label className="form-label" htmlFor="ing-proyecto">
            Proyecto
          </label>
          <input
            id="ing-proyecto"
            className="input-warm"
            placeholder="Opcional"
            value={form.proyecto}
            onChange={(event) => setForm({ ...form, proyecto: event.target.value })}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="ing-monto">
            Monto
          </label>
          <input
            id="ing-monto"
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
          <label className="form-label" htmlFor="ing-moneda">
            Moneda
          </label>
          <select
            id="ing-moneda"
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
          <label className="form-label" htmlFor="ing-cambio">
            Tipo de cambio a ARS
          </label>
          <input
            id="ing-cambio"
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
          <label className="form-label" htmlFor="ing-cobrado">
            Cobrado
          </label>
          <select
            id="ing-cobrado"
            className="input-warm"
            value={form.cobrado}
            onChange={(event) => setForm({ ...form, cobrado: event.target.value })}
          >
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="form-field span-2">
          <label className="form-label" htmlFor="ing-notas">
            Notas
          </label>
          <textarea
            id="ing-notas"
            className="input-warm"
            rows={2}
            placeholder="Opcional"
            value={form.notas}
            onChange={(event) => setForm({ ...form, notas: event.target.value })}
          />
        </div>
      </div>

      <div className="form-actions">
        {onCancel ? (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Registrar ingreso"}
        </button>
      </div>
    </form>
  );
}
