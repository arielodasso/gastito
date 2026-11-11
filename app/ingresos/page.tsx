"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/supabaseClient";

interface Ingreso {
  id: string;
  fecha: string;
  cliente_fuente: string;
  tipo: string;
  proyecto: string | null;
  monto: number;
  moneda: string;
  tipo_cambio_ars: number;
  monto_ars: number;
  cobrado: boolean;
  mes_clave: string;
  notas: string;
  impacta_resultados: boolean;
}

export default function Ingresos() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [nuevoIngreso, setNuevoIngreso] = useState<Partial<Ingreso>>({
    fecha: new Date().toISOString().split("T")[0],
    cliente_fuente: "",
    tipo: "Otro",
    proyecto: "",
    monto: 0,
    moneda: "ARS",
    tipo_cambio_ars: 1,
    cobrado: false,
    mes_clave: "",
    notas: "",
    impacta_resultados: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIngresos();
  }, []);

  async function fetchIngresos() {
    try {
      const { data, error } = await supabase
        .from("ingresos")
        .select("*")
        .order("fecha", { ascending: false });

      if (error) throw error;
      setIngresos(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching ingresos:", err);
      setError("Error cargando ingresos");
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!nuevoIngreso.cliente_fuente || (nuevoIngreso.monto ?? 0) <= 0) return;

    const mesClave = new Date(nuevoIngreso.fecha ?? Date.now()).toLocaleString("es-ES", { month: "long", year: "numeric" });

    const { data, error } = await supabase
      .from("ingresos")
      .insert([{
        id: crypto.randomUUID(),
        fecha: nuevoIngreso.fecha,
        cliente_fuente: nuevoIngreso.cliente_fuente,
        tipo: nuevoIngreso.tipo,
        proyecto: nuevoIngreso.proyecto || null,
        monto: nuevoIngreso.monto,
        moneda: nuevoIngreso.moneda,
        tipo_cambio_ars: nuevoIngreso.tipo_cambio_ars,
        cobrado: nuevoIngreso.cobrado,
        mes_clave: mesClave,
        notas: nuevoIngreso.notas || "",
        impacta_resultados: nuevoIngreso.impacta_resultados,
      }])
      .select()
      .single();

    if (error) throw error;
    setIngresos([data!, ...ingresos]);
    setNuevoIngreso({
      fecha: new Date().toISOString().split("T")[0],
      cliente_fuente: "",
      tipo: "Otro",
      proyecto: "",
      monto: 0,
      moneda: "ARS",
      tipo_cambio_ars: 1,
      cobrado: false,
      mes_clave: "",
      notas: "",
      impacta_resultados: true,
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que quieres eliminar este ingreso?")) return;
    const { error } = await supabase.from("ingresos").delete().eq("id", id);
    if (error) throw error;
    setIngresos(ingresos.filter((i) => i.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="prose max-w-none">Cargando ingresos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="alert alert-error">{error}<button onClick={() => fetchIngresos()} className="btn-link hover:underline">Reintentar</button></div>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-carbon-primary">Ingresos</h1>
        <p className="text-graphite-secondary text-sm">Registra tus fuentes de ingreso</p>
      </header>

      {/* Add Income Form */}
      <div className="card-warm shadow-warm p-6 mb-6">
        <h2 className="text-xl font-semibold text-carbon-primary mb-4">Nuevo Ingreso</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Fecha</label>
              <input
                type="date"
                value={nuevoIngreso.fecha}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, fecha: e.target.value })
                }
                className="input-warm"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Cliente / Fuente</label>
              <input
                value={nuevoIngreso.cliente_fuente}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, cliente_fuente: e.target.value })
                }
                className="input-warm"
                placeholder="Ej: Marcelo, Agustina, Cliente X"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm text-graphite-secondary block mb-1">Tipo</label>
              <select
                value={nuevoIngreso.tipo}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, tipo: e.target.value })
                }
                className="input-warm"
              >
                <option value="Freelance">Freelance</option>
                <option value="Otro">Otro</option>
                <option value="Sueldo">Sueldo</option>
                <option value="Inversión">Inversión</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Proyecto</label>
              <input
                value={nuevoIngreso.proyecto || ""}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, proyecto: e.target.value || null })
                }
                className="input-warm"
                placeholder="Proyecto opcional (ej: Viaja Seguro)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Monto</label>
              <input
                type="number"
                value={nuevoIngreso.monto}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, monto: Number(e.target.value) })
                }
                className="input-warm"
                min="0"
                step="100"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Moneda</label>
              <select
                value={nuevoIngreso.moneda}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, moneda: e.target.value })
                }
                className="input-warm"
              >
                <option value="ARS">ARS (Peso Argentino)</option>
                <option value="USD">USD (Dólar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Tipo de Cambio a ARS</label>
              <input
                type="number"
                value={nuevoIngreso.tipo_cambio_ars}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, tipo_cambio_ars: Number(e.target.value) })
                }
                className="input-warm"
                min="0"
                step="0.0001"
                placeholder="1 USD = X ARS"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Cobrado (Sí/No)</label>
              <select
                value={String(nuevoIngreso.cobrado)}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, cobrado: e.target.value === "true" })
                }
                className="input-warm"
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Mes Clave</label>
              <input
                value={nuevoIngreso.mes_clave}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, mes_clave: e.target.value })
                }
                className="input-warm"
                placeholder="Ej: enero 2026"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Impacta Resultados</label>
              <select
                value={String(nuevoIngreso.impacta_resultados)}
                onChange={(e) =>
                  setNuevoIngreso({ ...nuevoIngreso, impacta_resultados: e.target.value === "true" })
                }
                className="input-warm"
              >
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-graphite-secondary block mb-1">Notas</label>
            <textarea
              value={nuevoIngreso.notas || ""}
              onChange={(e) =>
                setNuevoIngreso({ ...nuevoIngreso, notas: e.target.value })
              }
              className="input-warm rounded-md h-24 p-3 resize-y"
              rows={3}
              placeholder="Notas adicionales..."
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn-primary w-full mt-4"
          >
            Registrar Ingreso
          </button>
        </form>
      </div>

      {/* Incomes List */}
      {ingresos.length === 0 && (
        <p className="text-ashen-secondary mt-4">No hay ingresos registrados. Usa el formulario de arriba para agregar uno.</p>
      )}

      <div className="overflow-x-auto mt-6">
        <table className="table-warm">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente / Fuente</th>
              <th>Tipo</th>
              <th>Proyecto</th>
              <th>Monto (ARS)</th>
              <th>Cobrado</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ingresos.map((ingreso) => (
              <tr key={ingreso.id} className="border-b warm-border">
                <td className="font-medium">{new Date(ingreso.fecha).toLocaleDateString("es-ES")}</td>
                <td>{ingreso.cliente_fuente}</td>
                <td>
                  {ingreso.tipo}
                </td>
                <td>{ingreso.proyecto || "-"}</td>
                <td>{ingreso.monto_ars.toLocaleString("es-AR")} ARS</td>
                <td>
                  <span
                    className={ingreso.cobrado ? "badge-si" : "badge-no"}
                  >
                    {ingreso.cobrado ? "Sí" : "No"}
                  </span>
                </td>
                <td>{ingreso.notas || "-"}</td>
                <td>
                  <button
                    onClick={() => { window.location.href = `/ingresos/editar/${ingreso.id}`; }}
                    className="text-[var(--clay)] text-sm hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(ingreso.id)}
                    className="text-red-600 text-sm hover:underline ml-2"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}