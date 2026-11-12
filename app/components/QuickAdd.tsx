"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/src/supabaseClient";
import { parseMovement } from "@/app/lib/parse";
import { ars } from "@/app/lib/format";

interface Props {
  onSaved?: () => void;
}

export default function QuickAdd({ onSaved }: Props) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );

  const preview = useMemo(() => {
    if (!value.trim()) return null;
    const parsed = parseMovement(value);
    return parsed.monto > 0 ? parsed : null;
  }, [value]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseMovement(value);
    if (parsed.monto <= 0) {
      setMessage({
        type: "error",
        text: "Necesito un monto. Ej: “Gasti 4500 en muzzarella en efectivo”.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const mesClave = parsed.fecha.slice(0, 7);

    try {
      if (parsed.tipo === "ingreso") {
        const { error } = await supabase.from("ingresos").insert([
          {
            id: crypto.randomUUID(),
            fecha: parsed.fecha,
            cliente_fuente: parsed.concepto,
            tipo: "Otro",
            proyecto: null,
            monto: parsed.monto,
            moneda: parsed.moneda,
            tipo_cambio_ars: 1,
            cobrado: true,
            mes_clave: mesClave,
            notas: parsed.notas,
            impacta_resultados: true,
          },
        ]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gastos").insert([
          {
            id: crypto.randomUUID(),
            fecha: parsed.fecha,
            concepto: parsed.concepto,
            categoria: parsed.tipo_503020 || "Deseos",
            tipo_503020: parsed.tipo_503020 || "Deseos",
            monto: parsed.monto,
            moneda: parsed.moneda,
            tipo_cambio_ars: 1,
            medio_pago: parsed.medio_pago || "Efectivo",
            fijo_variable: "Variable",
            mes_clave: mesClave,
            impacta_resultados: true,
          },
        ]);
        if (error) throw error;
      }

      setMessage({
        type: "ok",
        text: `${parsed.tipo === "ingreso" ? "Ingreso" : "Gasto"} guardado: ${
          parsed.concepto
        } · ${ars(parsed.monto)}`,
      });
      setValue("");
      onSaved?.();
    } catch (error) {
      console.error("Error guardando movimiento:", error);
      setMessage({
        type: "error",
        text: "No se pudo guardar el movimiento. Probá de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form className="quick-add" onSubmit={handleSubmit}>
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setMessage(null);
          }}
          placeholder="Gasti 4500 en muzzarella en efectivo…"
          aria-label="Cargar un movimiento rápido"
        />
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Guardando…" : "Agregar"}
        </button>
      </form>

      <p className="quick-note">
        {preview ? (
          <>
            Se registra como{" "}
            <strong>
              {preview.tipo === "ingreso" ? "ingreso" : "gasto"} de{" "}
              {ars(preview.monto)}
            </strong>
            {preview.concepto ? ` · ${preview.concepto}` : ""}
            {preview.tipo_503020 ? ` · ${preview.tipo_503020}` : ""}
          </>
        ) : message ? (
          <span style={{ color: message.type === "ok" ? "var(--mint-ink)" : "var(--brand-ink)" }}>
            {message.text}
          </span>
        ) : (
          <>
            <strong>Entrada rápida:</strong> escribí “Cobra 30000 de Marcelo” o
            “Pagué 4500 de sushi con débito”.
          </>
        )}
      </p>
    </div>
  );
}
