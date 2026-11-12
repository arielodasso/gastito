"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/src/supabaseClient";
import TopNav from "@/app/components/TopNav";
import { parseMovement, type ParsedMovement } from "@/app/lib/parse";
import { ars } from "@/app/lib/format";

const EXAMPLES = [
  "Gasti 4500 en muzzarella en efectivo",
  "Pagué 45000 de internet por transferencia",
  "Cobra 30000 de Marcelo",
];

export default function CargaRapidaPage() {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedMovement | null>(null);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );

  function parse(textValue: string) {
    const next = parseMovement(textValue);
    setParsed(next);
    setMessage(null);
  }

  function handleVoice() {
    const SpeechRecognitionCtor =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMessage({
        type: "error",
        text: "El reconocimiento de voz no está disponible en este navegador.",
      });
      return;
    }

    const recognition = new (SpeechRecognitionCtor as new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      onresult: (event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void;
      onerror: () => void;
      onend: () => void;
    })();

    recognition.lang = "es-AR";
    recognition.continuous = false;
    recognition.interimResults = false;
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      parse(transcript);
    };
    recognition.onerror = () => {
      setMessage({ type: "error", text: "No pudimos escucharte. Probá de nuevo." });
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function handleSave() {
    if (!parsed || parsed.monto <= 0) {
      setMessage({ type: "error", text: "Necesito un monto mayor a cero." });
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
        text: `Listo: ${parsed.tipo === "ingreso" ? "ingreso" : "gasto"} de ${ars(
          parsed.monto
        )} guardado.`,
      });
      setParsed(null);
      setText("");
    } catch (error) {
      console.error("Error guardando movimiento rápido:", error);
      setMessage({ type: "error", text: "No se pudo guardar. Probá otra vez." });
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof ParsedMovement>(key: K, value: ParsedMovement[K]) {
    setParsed((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <>
      <TopNav />
      <main className="container page">
        <div className="section-head">
          <div>
            <span className="kicker">Carga rápida</span>
            <h2>Escribí o dictá un movimiento</h2>
            <p>El sistema detecta monto, medio de pago y categoría 50/30/20.</p>
          </div>
          <Link href="/" className="btn btn-ghost btn-sm">
            Volver al resumen
          </Link>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="card">
            <p className="form-section-title">Texto inteligente</p>
            <p className="form-section-sub">
              Una frase alcanza. Después podés ajustar los detalles antes de guardar.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (text.trim()) parse(text);
              }}
            >
              <textarea
                className="input-warm"
                rows={4}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ej: Gasti 4500 en muzzarella en efectivo"
                aria-label="Movimiento a interpretar"
              />
              <button className="btn-primary" type="submit" style={{ width: "100%", marginTop: 12 }}>
                Interpretar movimiento
              </button>
            </form>

            <div className="divider" />

            <p className="form-label" style={{ marginBottom: 8 }}>
              Ejemplos
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: "flex-start", whiteSpace: "normal", textAlign: "left" }}
                  onClick={() => {
                    setText(example);
                    parse(example);
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="form-section-title">Carga por voz</p>
            <p className="form-section-sub">
              Dictá el movimiento en español. Usamos el reconocimiento del navegador.
            </p>

            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%" }}
              onClick={handleVoice}
              disabled={listening}
            >
              {listening ? "Escuchando…" : "Dictar con voz"}
            </button>

            <div className="card-soft" style={{ marginTop: 16 }}>
              <strong style={{ display: "block", marginBottom: 4 }}>
                Qué podés decir
              </strong>
              <span className="muted" style={{ fontSize: 13.5, fontWeight: 600 }}>
                “Pagué 4500 de sushi con débito”, “Cobra 30 mil de Marcelo” o
                “Gasti 12 mil de nafta en efectivo”.
              </span>
            </div>

            <div className="divider" />

            <p className="stat-label">Vista rápida</p>
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="soft" style={{ fontWeight: 700 }}>
                  Movimientos
                </span>
                <span className="badge badge-ahorro">auto-clasificados</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="soft" style={{ fontWeight: 700 }}>
                  Monedas
                </span>
                <span className="badge badge-deseos">ARS · USD · EUR</span>
              </div>
            </div>
          </div>
        </div>

        {message ? (
          <div
            className="alert"
            style={{
              marginTop: 18,
              ...(message.type === "ok"
                ? { color: "var(--mint-ink)", background: "#e7f8f1", borderColor: "#bcebd9" }
                : {}),
            }}
          >
            {message.text}
          </div>
        ) : null}

        {parsed ? (
          <div className="card" style={{ marginTop: 18 }}>
            <div className="section-head">
              <div>
                <h2>Revisá y guardá</h2>
                <p>Todo editable antes de confirmar.</p>
              </div>
              <span
                className={`badge ${
                  parsed.tipo === "ingreso" ? "badge-ahorro" : "badge-necesidades"
                }`}
              >
                {parsed.tipo === "ingreso" ? "Ingreso" : "Gasto"}
              </span>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="tipo">
                  Tipo
                </label>
                <select
                  id="tipo"
                  className="input-warm"
                  value={parsed.tipo}
                  onChange={(event) =>
                    update("tipo", event.target.value as "ingreso" | "gasto")
                  }
                >
                  <option value="gasto">Gasto</option>
                  <option value="ingreso">Ingreso</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="fecha">
                  Fecha
                </label>
                <input
                  id="fecha"
                  type="date"
                  className="input-warm"
                  value={parsed.fecha}
                  onChange={(event) => update("fecha", event.target.value)}
                />
              </div>
              <div className="form-field span-2">
                <label className="form-label" htmlFor="concepto">
                  Concepto
                </label>
                <input
                  id="concepto"
                  className="input-warm"
                  value={parsed.concepto}
                  onChange={(event) => update("concepto", event.target.value)}
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
                  value={parsed.monto || ""}
                  onChange={(event) => update("monto", Number(event.target.value))}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="moneda">
                  Moneda
                </label>
                <select
                  id="moneda"
                  className="input-warm"
                  value={parsed.moneda}
                  onChange={(event) => update("moneda", event.target.value)}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              {parsed.tipo === "gasto" ? (
                <>
                  <div className="form-field">
                    <label className="form-label" htmlFor="clasificacion">
                      Tipo 50/30/20
                    </label>
                    <select
                      id="clasificacion"
                      className="input-warm"
                      value={parsed.tipo_503020 || "Deseos"}
                      onChange={(event) =>
                        update(
                          "tipo_503020",
                          event.target.value as ParsedMovement["tipo_503020"]
                        )
                      }
                    >
                      <option value="Necesidades">Necesidades</option>
                      <option value="Deseos">Deseos</option>
                      <option value="Ahorro">Ahorro</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="medio">
                      Medio de pago
                    </label>
                    <select
                      id="medio"
                      className="input-warm"
                      value={parsed.medio_pago || "Efectivo"}
                      onChange={(event) => update("medio_pago", event.target.value)}
                    >
                      <option>Efectivo</option>
                      <option>Débito</option>
                      <option>Transferencia</option>
                      <option>Tarjeta Crédito</option>
                      <option>Cheque</option>
                      <option>Otro</option>
                    </select>
                  </div>
                </>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando…" : "Guardar movimiento"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setParsed(null);
                  setMessage(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
