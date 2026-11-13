"use client";

import { useState } from "react";
import { supabase } from "@/src/supabaseClient";
import type { Gasto } from "@/app/lib/finance";

export const GASTO_CATEGORIES = [
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

type FormValues = typeof EMPTY_FORM;

interface Props {
  initial?: Partial<FormValues>;
  onSaved?: (row: Gasto) => void;
  onCancel?: () => void;
}

export default function GastoForm({ initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<FormValues>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const monto = Number(form.monto);
    if (!form.concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      setError("Completá el concepto y un monto mayor a cero.");
      return;
    }

    setSaving(true);
    setError(null);

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

    setSaving(false);

    if (insertError) {
      setError("No se pudo guardar el gasto.");
      return;
    }

    setForm({ ...EMPTY_FORM, fecha: form.fecha });
    onSaved?.(data as Gasto);
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <div className="alert" style={{ marginBottom: 14 }}>{error}</div> : null}

      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="gas-fecha">
            Fecha
          </label>
          <input
            id="gas-fecha"
            type="date"
            className="input-warm"
            value={form.fecha}
            onChange={(event) => setForm({ ...form, fecha: event.target.value })}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="gas-concepto">
            Concepto
          </label>
          <input
            id="gas-concepto"
            className="input-warm"
            placeholder="Ej: Sushi con amigos"
            value={form.concepto}
            onChange={(event) => setForm({ ...form, concepto: event.target.value })}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="gas-categoria">
            Categoría
          </label>
          <select
            id="gas-categoria"
            className="input-warm"
            value={form.categoria}
            onChange={(event) => setForm({ ...form, categoria: event.target.value })}
          >
            {GASTO_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="gas-tipo">
            Tipo 50/30/20
          </label>
          <select
            id="gas-tipo"
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
          <label className="form-label" htmlFor="gas-monto">
            Monto
          </label>
          <input
            id="gas-monto"
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
          <label className="form-label" htmlFor="gas-moneda">
            Moneda
          </label>
          <select
            id="gas-moneda"
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
          <label className="form-label" htmlFor="gas-cambio">
            Tipo de cambio a ARS
          </label>
          <input
            id="gas-cambio"
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
          <label className="form-label" htmlFor="gas-medio">
            Medio de pago
          </label>
          <select
            id="gas-medio"
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
          <label className="form-label" htmlFor="gas-fijo">
            Fijo / Variable
          </label>
          <select
            id="gas-fijo"
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
          <label className="form-label" htmlFor="gas-impacta">
            Impacta resultados
          </label>
          <select
            id="gas-impacta"
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

      <div className="form-actions">
        {onCancel ? (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Registrar gasto"}
        </button>
      </div>
    </form>
  );
}
