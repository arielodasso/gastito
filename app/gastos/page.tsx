"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/supabaseClient";

interface Gasto {
  id: string;
  fecha: string;
  concepto: string;
  categoria: string;
  tipo_503020: "Necesidades" | "Deseos" | "Ahorro";
  monto: number;
  moneda: string;
  tipo_cambio_ars: number;
  monto_ars: number;
  medio_pago: "Efectivo" | "Débito" | "Transferencia" | "Tarjeta Crédito" | "Cheque" | "Otro";
  fijo_variable: "Fijo" | "Variable";
  mes_clave: string;
  impacta_resultados: boolean;
}

export default function Gastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [nuevoGasto, setNuevoGasto] = useState<Partial<Gasto>>({
    fecha: new Date().toISOString().split("T")[0],
    concepto: "",
    categoria: "",
    tipo_503020: "Deseos",
    monto: 0,
    moneda: "ARS",
    tipo_cambio_ars: 1,
    medio_pago: "Efectivo",
    fijo_variable: "Variable",
    mes_clave: "",
    impacta_resultados: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGastos();
  }, []);

  async function fetchGastos() {
    try {
      const { data, error } = await supabase
        .from("gastos")
        .select("*")
        .order("fecha", { ascending: false });

      if (error) throw error;
      setGastos(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching gastos:", err);
      setError("Error cargando gastos");
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!nuevoGasto.concepto || (nuevoGasto.monto ?? 0) <= 0) return;

    const mesClave = new Date(nuevoGasto.fecha ?? Date.now()).toLocaleString("es-ES", { month: "long", year: "numeric" });

    const { data, error } = await supabase
      .from("gastos")
      .insert([{
        id: crypto.randomUUID(),
        fecha: nuevoGasto.fecha,
        concepto: nuevoGasto.concepto,
        categoria: nuevoGasto.categoria,
        tipo_503020: nuevoGasto.tipo_503020,
        monto: nuevoGasto.monto,
        moneda: nuevoGasto.moneda,
        tipo_cambio_ars: nuevoGasto.tipo_cambio_ars,
        medio_pago: nuevoGasto.medio_pago,
        fijo_variable: nuevoGasto.fijo_variable,
        mes_clave: mesClave,
        impacta_resultados: nuevoGasto.impacta_resultados,
      }])
      .select()
      .single();

    if (error) throw error;
    setGastos([data!, ...gastos]);
    setNuevoGasto({
      fecha: new Date().toISOString().split("T")[0],
      concepto: "",
      categoria: "",
      tipo_503020: "Deseos",
      monto: 0,
      moneda: "ARS",
      tipo_cambio_ars: 1,
      medio_pago: "Efectivo",
      fijo_variable: "Variable",
      mes_clave: "",
      impacta_resultados: true,
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que quieres eliminar este gasto?")) return;
    const { error } = await supabase.from("gastos").delete().eq("id", id);
    if (error) throw error;
    setGastos(gastos.filter((g) => g.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="prose max-w-none">Cargando gastos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="alert alert-error">{error}<button onClick={() => fetchGastos()} className="btn-link hover:underline">Reintentar</button></div>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-carbon-primary">Gastos</h1>
        <p className="text-graphite-secondary text-sm">Registra tus egresos</p>
      </header>

      {/* Add Expense Form */}
      <div className="card-warm shadow-warm p-6 mb-6">
        <h2 className="text-xl font-semibold text-carbon-primary mb-4">Nuevo Gasto</h2>
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
                value={nuevoGasto.fecha}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, fecha: e.target.value })
                }
                className="input-warm"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Concepto</label>
              <input
                value={nuevoGasto.concepto}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })
                }
                className="input-warm"
                placeholder="Ej: Palmeritas para merienda"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm text-graphite-secondary block mb-1">Categoría</label>
              <select
                value={nuevoGasto.categoria}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, categoria: e.target.value })
                }
                className="input-warm"
              >
                <option value="Comida (delivery/salidas)">Comida (delivery/salidas)</option>
                <option value="Internet">Internet</option>
                <option value="Regalos">Regalos</option>
                <option value="Salud">Salud</option>
                <option value="Transporte">Transporte</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Tipo 50/30/20</label>
              <select
                value={nuevoGasto.tipo_503020}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, tipo_503020: e.target.value as any })
                }
                className="input-warm"
              >
                <option value="Necesidades">Necesidades</option>
                <option value="Deseos">Deseos</option>
                <option value="Ahorro">Ahorro/Inversión</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Medio de Pago</label>
              <select
                value={nuevoGasto.medio_pago}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, medio_pago: e.target.value as any })
                }
                className="input-warm"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Débito">Débito</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta Crédito">Tarjeta Crédito</option>
                <option value="Cheque">Cheque</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Fijo/Variable</label>
              <select
                value={nuevoGasto.fijo_variable}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, fijo_variable: e.target.value as any })
                }
                className="input-warm"
              >
                <option value="Fijo">Fijo</option>
                <option value="Variable">Variable</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Monto</label>
              <input
                type="number"
                value={nuevoGasto.monto}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, monto: Number(e.target.value) })
                }
                className="input-warm"
                min="0"
                step="100"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Moneda</label>
              <select
                value={nuevoGasto.moneda}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, moneda: e.target.value })
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
                value={nuevoGasto.tipo_cambio_ars}
                onChange={(e) =>
                  setNuevoGasto({ ...nuevoGasto, tipo_cambio_ars: Number(e.target.value) })
                }
                className="input-warm"
                min="0"
                step="0.0001"
                placeholder="1 USD = X ARS"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-graphite-secondary block mb-1">Impacta Resultados</label>
            <select
              value={String(nuevoGasto.impacta_resultados ?? true)}
              onChange={(e) =>
                setNuevoGasto({ ...nuevoGasto, impacta_resultados: e.target.value === "true" })
              }
              className="input-warm"
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary w-full mt-4"
          >
            Registrar Gasto
          </button>
        </form>
      </div>

      {/* Expenses List */}
      {gastos.length === 0 && (
        <p className="text-ashen-secondary mt-4">No hay gastos registrados. Usa el formulario de arriba para agregar uno.</p>
      )}

      <div className="overflow-x-auto mt-6">
        <table className="table-warm">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Categoría</th>
              <th>Tipo 50/30/20</th>
              <th>Monto (ARS)</th>
              <th>Medio Pago</th>
              <th>Fijo/Variable</th>
              <th>Impacta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {gastos.map((gasto) => (
              <tr key={gasto.id} className="border-b warm-border">
                <td className="font-medium">{new Date(gasto.fecha).toLocaleDateString("es-ES")}</td>
                <td>{gasto.concepto}</td>
                <td>
                  <span
                    className={gasto.tipo_503020 === "Necesidades"
                      ? "badge-necesidades"
                      : gasto.tipo_503020 === "Deseos"
                        ? "badge-deseos"
                        : "badge-ahorro"}
                  >
                    {gasto.tipo_503020}
                  </span>
                </td>
                <td>{gasto.monto_ars.toLocaleString("es-AR")} ARS</td>
                <td>
                  <span className={`badge-${gasto.medio_pago}`}>{gasto.medio_pago}</span>
                </td>
                <td>
                  <span className={gasto.fijo_variable === "Fijo" ? "text-carbon-primary" : "text-graphite-secondary"}>
                    {gasto.fijo_variable}
                  </span>
                </td>
                <td>
                  <span
                    className={gasto.impacta_resultados ? "badge-si" : "badge-no"}
                  >
                    {gasto.impacta_resultados ? "Sí" : "No"}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => { window.location.href = `/gastos/editar/${gasto.id}`; }}
                    className="text-[var(--clay)] text-sm hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(gasto.id)}
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