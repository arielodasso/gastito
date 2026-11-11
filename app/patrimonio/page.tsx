"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/supabaseClient";

export default function Patrimonio() {
  const [evolucion, setEvolucion] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Get patrimonio evolution
      const { data: patrimonioData, error: patrimonioError } = await supabase
        .from("patrimonio")
        .select("*")
        .order("ano", { ascending: true })
        .order("mes_numero", { ascending: true });

      if (patrimonioError) throw patrimonioError;
      setEvolucion(patrimonioData || []);

      // Get 50/30/20 resumen
      const { data: resumenData, error: resumenError } = await supabase
        .from("resumen_503020")
        .select("*")
        .order("ano", { ascending: true })
        .order("mes_numero", { ascending: true });

      if (resumenError) throw resumenError;
      setResumen(resumenData || []);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching patrimonio data:", err);
      setError("Error cargando datos patrimoniales");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="prose max-w-none">Cargando patrimonio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="alert alert-error">{error}<button onClick={() => fetchData()} className="btn-link hover:underline">Reintentar</button></div>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-carbon-primary">Patrimonio y Resumen</h1>
        <p className="text-graphite-secondary text-sm">Evolución mensual y cumplimiento de la regla 50/30/20</p>
      </header>

      {/* Patrimonio Evolution Chart Area */}
      <div className="card-warm shadow-warm p-6 mb-8">
        <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-4">Evolución del Patrimonio</p>
        
        {evolucion.length === 0 && (
          <p className="text-ashen-secondary">No hay datos patrimoniales. Agrega ingresos y gastos para ver la evolución.</p>
        )}

        {evolucion.length > 0 && (
          <div className="space-y-4">
            {evolucion.map((item, index) => (
              <div key={index} className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{`${item.mes_clave} ${item.ano}`}</p>
                  <p className="text-ashen-secondary text-sm">{item.mes_numero}.0</p>
                </div>
                <div className="w-32 text-right">
                  <p className="text-2xl font-bold text-carbon-primary">{item.patrimonio_inicial_ars.toLocaleString("es-AR")} ARS</p>
                  <p className="text-graphite-secondary text-sm">Initial</p>
                  <p className={`text-2xl font-bold ${item.patrimonio_final_ars >= item.patrimonio_inicial_ars ? "text-green-600" : "text-red-600"}`}>
                    {item.patrimonio_final_ars.toLocaleString("es-AR")} ARS
                  </p>
                  <p className="text-graphite-secondary text-sm">Final</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 50/30/20 Compliance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Necesidades */}
        <div className="card-soft shadow-warm p-4">
          <p className="text-[var(--color-clay)] text-sm font-medium uppercase tracking-wider mb-2">Necesidades (50%)</p>
          <p className="text-3xl font-bold text-carbon-primary" id="nec-pct">0%</p>
          <div className="w-full bg-[var(--border)] rounded-full h-4 mt-2">
            <div
              className="h-full rounded-tl-md rounded-bl-md bg-[var(--clay)]"
              style={{ width: "0%" }}
            ></div>
          </div>
        </div>

        {/* Deseos */}
        <div className="card-soft shadow-warm p-4">
          <p className="text-[var(--color-clay)] text-sm font-medium uppercase tracking-wider mb-2">Deseos (30%)</p>
          <p className="text-3xl font-bold text-carbon-primary" id="des-pct">0%</p>
          <div className="w-full bg-[var(--border)] rounded-full h-4 mt-2">
            <div
              className="h-full rounded-tl-md rounded-bl-md bg-[var(--clay)]"
              style={{ width: "0%" }}
            ></div>
          </div>
        </div>

        {/* Ahorro/Inversión */}
        <div className="card-soft shadow-warm p-4">
          <p className="text-[var(--color-clay)] text-sm font-medium uppercase tracking-wider mb-2">Ahorro/Inversión (20%)</p>
          <p className="text-3xl font-bold text-carbon-primary" id="ahorro-pct">0%</p>
          <div className="w-full bg-[var(--border)] rounded-full h-4 mt-2">
            <div
              className="h-full rounded-tl-md rounded-bl-md bg-[var(--clay)]"
              style={{ width: "0%" }}
            ></div>
          </div>
        </div>
      </div>

      {/* Detailed Resumen Table */}
      {resumen.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table-warm">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Año</th>
                <th>Necesidades Asignado</th>
                <th>Deseos Asignado</th>
                <th>Ahorro Asignado</th>
                <th>Necesidades Gasto</th>
                <th>Deseos Gasto</th>
                <th>Ahorro Gasto</th>
                <th>Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((item, index) => (
                <tr key={index} className="border-b warm-border">
                  <td>{item.mes_clave}</td>
                  <td>{item.ano}</td>
                  <td>{item.necesita_asignado.toLocaleString("es-AR")} ARS</td>
                  <td>{item.deseo_asignado.toLocaleString("es-AR")} ARS</td>
                  <td>{item.ahorro_asignado.toLocaleString("es-AR")} ARS</td>
                  <td>{item.necesidad_gasto.toLocaleString("es-AR")} ARS</td>
                  <td>{item.deseo_gasto.toLocaleString("es-AR")} ARS</td>
                  <td>{item.ahorro_gasto.toLocaleString("es-AR")} ARS</td>
                  <td>
                    <span className="text-[var(--clay)] font-medium">{item.cumplimiento_nec_pct.toFixed(1)}%</span>
                    / <span className="text-[var(--clay)] font-medium">{item.cumplimiento_des_pct.toFixed(1)}%</span>
                    / <span className="text-[var(--clay)] font-medium">{item.cumplimiento_ahorro_pct.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action: Add Patrimonio Manual Entry */}
      <div className="card-warm shadow-warm p-6 mt-8">
        <h2 className="text-xl font-semibold text-carbon-primary mb-4">Agregar Evolución Manual</h2>
        <p className="text-ashen-secondary text-sm mb-4">Si ya tienes datos del Excel, puedes ingresarlos aquí para comenzar el seguimiento patrimonial.</p>
        
        <form
          onSubmit={e => {
            e.preventDefault();
            // Placeholder for manual patrimonio entry
            alert("Función de entrada manual de patrimonio - próximamente");
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Mes (clave)</label>
              <input
                type="text"
                placeholder="Ej: enero 2026"
                className="input-warm"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Año</label>
              <input
                type="number"
                min="2020"
                max="2030"
                className="input-warm"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Patrimonio Inicial (ARS)</label>
              <input
                type="number"
                min="0"
                className="input-warm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Ingresos del Mes (ARS)</label>
              <input
                type="number"
                min="0"
                className="input-warm"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Gastos del Mes (ARS)</label>
              <input
                type="number"
                min="0"
                className="input-warm"
              />
            </div>

            <div>
              <label className="text-sm text-graphite-secondary block mb-1">Patrimonio Final (ARS)</label>
              <input
                type="number"
                min="0"
                className="input-warm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full mt-4"
          >
            Guardar Evolución
          </button>
        </form>
      </div>
    </main>
  );
}