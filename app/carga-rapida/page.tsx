"use client";

import { useState } from "react";
import { supabase } from "@/src/supabaseClient";

interface ParsedMovement {
  tipo: "ingreso" | "gasto";
  concepto: string;
  monto: number;
  moneda: string;
  tipo_cambio_ars?: number;
  medio_pago?: string;
  tipo_503020?: "Necesidades" | "Deseos" | "Ahorro";
  fecha: string;
  notas: string;
}

export default function CargaRapida() {
  const [inputText, setInputText] = useState("");
  const [parsed, setParsed] = useState<ParsedMovement | null>(null);
  const [showVoice, setShowVoice] = useState(false);

  const handleParseText = () => {
    const text = inputText.trim();
    if (!text) return;

    // Parse text like: "Gasti 4500 en muzzarella en efectivo"
    // or: "Cobra 400000 de Marcelo por Viaja Seguro"

    const result: ParsedMovement = {
      tipo: "gasto",
      concepto: "",
      monto: 0,
      moneda: "ARS",
      fecha: new Date().toISOString().split("T")[0],
      notas: "",
    };

    // Detect if income or expense
    if (/^(cobra|ingresa|recibí|recibi|venció|vencio|pagará|pagara)/i.test(text)) {
      result.tipo = "ingreso";
    }

    // Extract amount (look for numbers)
    const amountMatch = text.match(/[\d\s,.]+/);
    if (amountMatch) {
      const amountStr = amountMatch[0]
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(/,/g, ".");
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        result.monto = amount;
      }
    }

    // Extract concept - remove numbers and known words
    let conceptoText = text;
    conceptoText = conceptoText.replace(/[\d\s,.]+/g, "").trim();
    conceptoText = conceptoText
      .replace(/(?:en|con|por)\s+(efectivo|tarjeta|transferencia|debito|débito|credito|crédito|cheque)?/gi, "")
      .trim();
    conceptoText = conceptoText.replace(/(?:de|por)\s+\w+/gi, "").trim();

    result.concepto = conceptoText || "Gasto/comprobante";

    // Determine medio_pago and tipo_503020
    if (/efectivo/i.test(text)) {
      result.medio_pago = "Efectivo";
    } else if (/débito|debito|tarjeta|crédito|credito/i.test(text)) {
      result.medio_pago = "Débito";
    } else if (/transferencia/i.test(text)) {
      result.medio_pago = "Transferencia";
    }

    // Determine tipo 50/30/20
    if (/necesida|alquiler|comida|servicio|basic/i.test(text)) {
      result.tipo_503020 = "Necesidades";
    } else if (/deseo|regalo|entretenimiento/i.test(text)) {
      result.tipo_503020 = "Deseos";
    } else if (/ahorro|inversión|inversion|ahorrar/i.test(text)) {
      result.tipo_503020 = "Ahorro";
    }

    setParsed(result);
  };

  const handleAddToDatabase = async () => {
    if (!parsed?.concepto || parsed.monto <= 0) return;

    const mesClave = new Date(parsed.fecha).toLocaleString("es-ES", {
      month: "long",
      year: "numeric",
    });

    if (parsed.tipo === "ingreso") {
      const { error } = await supabase.from("ingresos").insert([
        {
          id: crypto.randomUUID(),
          fecha: parsed.fecha,
          cliente_fuente: parsed.concepto,
          tipo: "Otro",
          proyecto: parsed.notas || null,
          monto: parsed.monto,
          moneda: parsed.moneda,
          tipo_cambio_ars: parsed.tipo_cambio_ars || 1,
          cobrado: true,
          mes_clave: mesClave,
          notas: parsed.notas || "",
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
          tipo_cambio_ars: parsed.tipo_cambio_ars || 1,
          medio_pago: parsed.medio_pago || "Efectivo",
          fijo_variable: "Variable",
          mes_clave: mesClave,
          impacta_resultados: true,
        },
      ]);

      if (error) throw error;
    }

    setInputText("");
    setParsed(null);
    alert("Movimiento guardado correctamente!");
  };

  return (
    <main className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-carbon-primary">Carga Rápida</h1>
        <p className="text-graphite-secondary text-sm">
          Ingresa gastos o ingresos de forma rápida
        </p>
      </header>

      {/* Text Input Section */}
      <div className="card-warm shadow-warm p-6 mb-6">
        <h2 className="text-xl font-semibold text-carbon-primary mb-4">
          Texto Inteligente
        </h2>
        <p className="text-ashen-secondary text-sm mb-4">
          Ejemplos:
          <br />
          • &quot;Gasti 4500 en muzzarella en efectivo&quot;
          <br />
          • &quot;Cobra 400000 de Marcelo por Viaja Seguro&quot;
          <br />
          • &quot;Pague 76315 de Internet por transferencia&quot;
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleParseText();
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-graphite-secondary block mb-1">
                Escribe tu movimiento
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="input-warm rounded-md h-24 p-3 resize-y"
                rows={3}
                placeholder="Ej: Gasti 4500 en muzzarella en efectivo"
                aria-label="Ingresa tu movimiento"
              ></textarea>
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">
                &nbsp;
              </label>
              <button type="submit" className="btn-primary w-full">
                Parsear
              </button>
            </div>
          </div>
        </form>

        <button
          type="button"
          onClick={() => setShowVoice((v) => !v)}
          className="btn-accent text-[var(--clay)] underline text-sm"
        >
          {showVoice ? "Ocultar carga por voz" : "Usar carga por voz"}
        </button>
      </div>

      {/* Voice Input Section */}
      {showVoice && (
        <div className="card-warm shadow-warm p-6 mb-6">
          <h2 className="text-xl font-semibold text-carbon-primary mb-4">
            Carga por Voz
          </h2>
          <p className="text-ashen-secondary text-sm mb-4">
            Haz clic en el botón y dicta tu movimiento de forma coloquial.
          </p>
          <button
            onClick={() => {
              // Web Speech API
              const SpeechRecognitionCtor =
                (window as any).SpeechRecognition ||
                (window as any).webkitSpeechRecognition;
              if (!SpeechRecognitionCtor) {
                alert("El reconocimiento de voz no está disponible en este navegador.");
                return;
              }
              const recognition = new SpeechRecognitionCtor();
              recognition.lang = "es-AR";
              recognition.continuous = false;
              recognition.interimResults = false;

              recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputText(transcript);
                handleParseText();
              };

              recognition.onerror = (event: any) => {
                console.error("Voice recognition error:", event.error);
                alert("Error en el reconocimiento de voz. Inténtalo de nuevo.");
              };

              recognition.start();
            }}
            className="btn-accent w-full text-[var(--clay)] border border-[var(--clay)] mt-4"
          >
            Dictar con Voz
          </button>
        </div>
      )}

      {/* Photo/Comprobante Upload Section */}
      <div className="card-warm shadow-warm p-6">
        <h2 className="text-xl font-semibold text-carbon-primary mb-4">
          Carga por Foto / Comprobante
        </h2>
        <p className="text-ashen-secondary text-sm mb-4">
          Sube una captura de ticket o comprobante de transferencia. El sistema
          usará IA para autocompletar los campos.
        </p>

        <div className="border rounded-xl border-[var(--border)] p-6 text-center min-h-[180px]">
          <div className="text-ashen-secondary mb-4">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15l3 3L9 18l-3-3" />
            </svg>
          </div>
          <p className="text-graphite-secondary">
            Arrastra y suelta un archivo o haz clic para subir
          </p>
          <p className="text-xs text-ashen-secondary mt-2">
            Soporte: JPG, PNG, PDF
          </p>
          <input
            type="file"
            className="hidden"
            accept="image/*, application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                alert(
                  `Archivo seleccionado: ${file.name}\n(Función OCR próxima - por ahora ingresa manualmente los datos)`
                );
              }
            }}
          />
          <button className="btn-primary mt-3" type="button">
            Subir Comprobante
          </button>
        </div>
      </div>

      {/* Parsed Result Preview */}
      {parsed && (
        <div className="card-soft shadow-warm p-6 mt-6">
          <h3 className="text-xl font-semibold text-carbon-primary mb-4">
            Vista Previa del Movimiento Parseado
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-1">
                Tipo
              </p>
              <span
                className={
                  parsed.tipo === "ingreso" ? "text-green-600" : "text-red-600"
                }
              >
                {parsed.tipo === "ingreso" ? "INGRESO" : "GASTO"}
              </span>
            </div>
            <div>
              <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-1">
                Concepto
              </p>
              <span className="font-medium text-carbon-primary">
                {parsed.concepto}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-1">
                Monto
              </p>
              <span className="text-3xl font-bold text-carbon-primary">
                {parsed.monto.toLocaleString("es-AR")} {parsed.moneda}
              </span>
            </div>
            <div>
              <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-1">
                Fecha
              </p>
              <span className="font-medium text-carbon-primary">
                {new Date(parsed.fecha).toLocaleDateString("es-ES")}
              </span>
            </div>
          </div>

          {parsed.medio_pago && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-1">
                Medio de Pago
              </p>
              <span className="badge-necesidades">{parsed.medio_pago}</span>
            </div>
          )}

          {parsed.tipo_503020 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-1">
                Tipo 50/30/20
              </p>
              <span
                className={
                  parsed.tipo_503020 === "Necesidades"
                    ? "badge-necesidades"
                    : parsed.tipo_503020 === "Deseos"
                    ? "badge-deseos"
                    : "badge-ahorro"
                }
              >
                {parsed.tipo_503020}
              </span>
            </div>
          )}

          <button
            onClick={handleAddToDatabase}
            className="btn-primary w-full mt-4"
          >
            Guardar en la Base de Datos
          </button>

          <button
            onClick={() => setParsed(null)}
            className="btn-accent w-full text-[var(--clay)] border border-[var(--clay)] mt-2"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Quick Tips */}
      <div className="card-soft shadow-warm p-6 mt-8">
        <h3 className="text-semibold text-carbon-primary mb-3">
          Tips para una carga más rápida
        </h3>
        <ul className="text-ashen-secondary space-y-2 text-sm">
          <li>Usa formato consistente: &quot;Monto concepto medio_pago&quot;</li>
          <li>
            Menciona el tipo 50/30/20 si quieres clasificarlo: &quot;4500 cena
            deseado&quot;
          </li>
          <li>
            Incluye &quot;en efectivo&quot;, &quot;por transferencia&quot;,
            &quot;con tarjeta&quot; para el medio de pago
          </li>
          <li>
            Para ingresos: empieza con &quot;Cobra&quot;, &quot;Ingresa&quot;,
            &quot;Venció&quot;
          </li>
        </ul>
      </div>
    </main>
  );
}
