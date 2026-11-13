"use client";

import { useMemo, useRef, useState } from "react";
import { supabase } from "@/src/supabaseClient";
import Modal from "@/app/components/Modal";
import IngresoForm from "@/app/components/IngresoForm";
import GastoForm from "@/app/components/GastoForm";
import { parseMovement } from "@/app/lib/parse";
import { ars } from "@/app/lib/format";

type Status = { type: "ok" | "error" | "info"; text: string } | null;

type IngresoInitial = {
  fecha: string;
  cliente_fuente: string;
  monto: string;
  moneda: string;
};

type GastoInitial = {
  fecha: string;
  concepto: string;
  monto: string;
  moneda: string;
  medio_pago: string;
  tipo_503020: string;
  categoria: string;
};

interface Props {
  onSaved?: () => void;
}

export default function QuickRegister({ onSaved }: Props) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [message, setMessage] = useState<Status>(null);
  const [ingresoOpen, setIngresoOpen] = useState(false);
  const [gastoOpen, setGastoOpen] = useState(false);
  const [ingresoInitial, setIngresoInitial] = useState<IngresoInitial | undefined>();
  const [gastoInitial, setGastoInitial] = useState<GastoInitial | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (!value.trim()) return null;
    const parsed = parseMovement(value);
    return parsed.monto > 0 ? parsed : null;
  }, [value]);

  function handleSaved() {
    setIngresoOpen(false);
    setGastoOpen(false);
    setValue("");
    setMessage({ type: "ok", text: "Movimiento guardado." });
    onSaved?.();
  }

  async function handleQuickSave(event: React.FormEvent) {
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
      onresult: (event: {
        results: { [key: number]: { [key: number]: { transcript: string } } };
      }) => void;
      onerror: () => void;
      onend: () => void;
    })();

    recognition.lang = "es-AR";
    recognition.continuous = false;
    recognition.interimResults = false;
    setListening(true);
    setMessage({ type: "info", text: "Escuchando… dictá el movimiento." });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setValue(transcript);
      setMessage({
        type: "info",
        text: `Escuché “${transcript}”. Revisá y agregá.`,
      });
    };
    recognition.onerror = () => {
      setMessage({ type: "error", text: "No pudimos escucharte. Probá de nuevo." });
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoLoading(true);
    setMessage({
      type: "info",
      text: "Leyendo la foto… la primera vez puede tardar unos segundos.",
    });

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("spa");
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const text = data.text.replace(/\s+/g, " ").trim();
      if (!text) {
        setMessage({
          type: "error",
          text: "No pudimos leer la foto. Probá con una imagen más nítida.",
        });
        return;
      }

      setValue(text);
      const parsed = parseMovement(text);

      if (parsed.monto > 0) {
        if (parsed.tipo === "ingreso") {
          setIngresoInitial({
            fecha: parsed.fecha,
            cliente_fuente: parsed.concepto,
            monto: String(parsed.monto),
            moneda: parsed.moneda,
          });
          setIngresoOpen(true);
        } else {
          setGastoInitial({
            fecha: parsed.fecha,
            concepto: parsed.concepto,
            monto: String(parsed.monto),
            moneda: parsed.moneda,
            medio_pago: parsed.medio_pago || "Efectivo",
            tipo_503020: parsed.tipo_503020 || "Deseos",
            categoria: "Otros",
          });
          setGastoOpen(true);
        }
        setMessage({
          type: "info",
          text: "Foto leída. Revisá los datos antes de guardar.",
        });
      } else {
        setMessage({
          type: "info",
          text: `Leímos “${text}”. No encontramos un monto: completalo y agregá.`,
        });
      }
    } catch (error) {
      console.error("Error leyendo la foto:", error);
      setMessage({
        type: "error",
        text: "No pudimos procesar la foto. Revisá tu conexión y probá de nuevo.",
      });
    } finally {
      setPhotoLoading(false);
    }
  }

  return (
    <>
      <div className="card quick-register">
        <form className="quick-add" onSubmit={handleQuickSave}>
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setMessage(null);
            }}
            placeholder="Gasti 4500 en muzzarella en efectivo…"
            aria-label="Cargar un movimiento rápido"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || photoLoading}
          >
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
            <span
              style={{
                color:
                  message.type === "ok"
                    ? "var(--mint-ink)"
                    : message.type === "error"
                      ? "var(--brand-ink)"
                      : undefined,
              }}
            >
              {message.text}
            </span>
          ) : (
            <>
              Escribí, dictá o sacá una foto. Ej: “Cobra 30000 de Marcelo” o
              “Pagué 4500 de sushi con débito”.
            </>
          )}
        </p>

        <div className="quick-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setIngresoOpen(true)}
          >
            Nuevo ingreso
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setGastoOpen(true)}
          >
            Nuevo gasto
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleVoice}
            disabled={listening}
          >
            {listening ? "Escuchando…" : "Por voz"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={photoLoading}
          >
            {photoLoading ? "Leyendo foto…" : "Con foto"}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handlePhoto}
        />
      </div>

      <Modal
        open={ingresoOpen}
        title="Nuevo ingreso"
        size="lg"
        onClose={() => setIngresoOpen(false)}
      >
        <IngresoForm
          initial={ingresoInitial}
          onSaved={handleSaved}
          onCancel={() => setIngresoOpen(false)}
        />
      </Modal>

      <Modal
        open={gastoOpen}
        title="Nuevo gasto"
        size="lg"
        onClose={() => setGastoOpen(false)}
      >
        <GastoForm
          initial={gastoInitial}
          onSaved={handleSaved}
          onCancel={() => setGastoOpen(false)}
        />
      </Modal>
    </>
  );
}
