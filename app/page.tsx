"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { supabase } from "@/src/supabaseClient";

interface SummaryStats {
  patrimonioInicial: number;
  ingresosMes: number;
  gastosMes: number;
  patrimonioFinal: number;
  cumplimientoNec: number;
  cumplimientoDes: number;
  cumplimientoAhorro: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    try {
      // Get the latest patrimonio record
      const { data: patrimonioData, error: patrimonioError } = await supabase
        .from("patrimonio")
        .select("*")
        .order("ano", { ascending: false })
        .limit(1);

      if (patrimonioError) throw patrimonioError;

      // Get latest resumen 50/30/20
      const { data: resumenData, error: resumenError } = await supabase
        .from("resumen_503020")
        .select("*")
        .order("ano", { ascending: false })
        .limit(1);

      if (resumenError) throw resumenError;

      // Get this month's totals from gastos and ingresos
      const today = new Date();
      const mesActual = today.getMonth() + 1; // 1-12
      const anoActual = today.getFullYear();

      const { data: ingresosData, error: ingresosError } = await supabase
        .from("ingresos")
        .select("monto_ars")
        .gte("fecha", `${anoActual}-${mesActual}-01`)
        .lt("fecha", `${anoActual}-${mesActual + 1}-01`);

      if (ingresosError) throw ingresosError;

      const { data: gastosData, error: gastosError } = await supabase
        .from("gastos")
        .select("monto_ars")
        .gte("fecha", `${anoActual}-${mesActual}-01`)
        .lt("fecha", `${anoActual}-${mesActual + 1}-01`);

      if (gastosError) throw gastosError;

      // Calculate totals
      const totalIngresos = ingresosData?.reduce((sum, r) => sum + (r.monto_ars || 0), 0) || 0;
      const totalGastos = gastosData?.reduce((sum, r) => sum + (r.monto_ars || 0), 0) || 0;

      // Get initial heritage from the first patrimonio record or calculate
      let patrimonioInicial = 0;
      let patrimonioFinal = 0;
      if (patrimonioData && patrimonioData.length > 0) {
        const first = patrimonioData[patrimonioData.length - 1]; // oldest
        patrimonioInicial = first.patrimonio_inicial_ars || 0;
        patrimonioFinal = first.patrimonio_final_ars || 0;
      } else {
        // If no records, use current state
        patrimonioInicial = 0;
        patrimonioFinal = totalIngresos - totalGastos;
      }

      patrimonioFinal = patrimonioInicial + totalIngresos - totalGastos;

      // Calculate 50/30/20 compliance from the resumen table
      let cumplimientoNec = 0, cumplimientoDes = 0, cumplimientoAhorro = 0;
      if (resumenData && resumenData.length > 0) {
        const latest = resumenData[0];
        cumplimientoNec = latest.cumplimiento_nec_pct || 0;
        cumplimientoDes = latest.cumplimiento_des_pct || 0;
        cumplimientoAhorro = latest.cumplimiento_ahorro_pct || 0;
      }

      setStats({
        patrimonioInicial,
        ingresosMes: totalIngresos,
        gastosMes: totalGastos,
        patrimonioFinal,
        cumplimientoNec,
        cumplimientoDes,
        cumplimientoAhorro,
      });
    } catch (err) {
      console.error("Error fetching summary:", err);
      setError("Error cargando el resumen. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="prose max-w-none">
          <p>Cargando resumen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="alert alert-error">
          {error}
          <button
            onClick={() => {
              setError(null);
              fetchSummary();
            }}
            className="btn-link hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8">No hay datos disponibles.</div>;
  }

  const { patrimonioInicial, ingresosMes, gastosMes, patrimonioFinal, cumplimientoNec, cumplimientoDes, cumplimientoAhorro } = stats;

  return (
    <main className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-carbon-primary mb-2">Gastito</h1>
        <p className="text-graphite-secondary">Resumen mensual de finanzas personales</p>
      </header>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Patrimonio Card */}
        <div className="card-warm shadow-warm p-6">
          <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-2">Patrimonio</p>
          <p className="text-4xl font-bold text-carbon-primary">{patrimonioFinal.toLocaleString()} ARS</p>
          <p className="text-sm text-graphite-secondary">
            {patrimonioInicial > 0 ? `+${(patrimonioFinal - patrimonioInicial).toLocaleString()} ARS` : "En construcción"}
          </p>
        </div>

        {/* Ingresos del Mes Card */}
        <div className="card-warm shadow-warm p-6">
          <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-2">Ingresos Mes</p>
          <p className="text-4xl font-bold text-carbon-primary">{ingresosMes.toLocaleString()} ARS</p>
        </div>

        {/* Gastos del Mes Card */}
        <div className="card-warm shadow-warm p-6">
          <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-2">Gastos Mes</p>
          <p className="text-4xl font-bold text-carbon-primary">{gastosMes.toLocaleString()} ARS</p>
          <p className="text-sm text-graphite-secondary">
            {ingresosMes > gastosMes ? "Superávit" : "Déficit"}
          </p>
        </div>

        {/* Cumplimiento 50/30/20 Card */}
        <div className="card-warm shadow-warm p-6">
          <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-2">Regla 50/30/20</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-graphite-secondary">Necesidades (50%)</span>
              <span>{(Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 50, 50).toFixed(1))}%</span>
            </div>
            <div className="w-full bg-[var(--border)] rounded-full h-2">
              <div
                className="h-full rounded-tl-md rounded-bl-md bg-[var(--clay)]"
                style={{ width: `${Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 50, 50)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-ashen-secondary">
              <span>{Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 50, 50).toFixed(0)}%</span>
              <span>{Math.max(50 - Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 50, 50), 0).toFixed(0)}%</span>
            </div>
          </div>

          <div className="mt-3 flex justify-between text-sm mb-1">
            <span className="text-graphite-secondary">Deseos (30%)</span>
            <span>{Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 30, 30).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[var(--border)] rounded-full h-2">
            <div
              className="h-full rounded-tl-md rounded-bl-md bg-[var(--clay)]"
              style={{ width: `${Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 30, 30)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-ashen-secondary">
            <span>{Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 30, 30).toFixed(0)}%</span>
            <span>{Math.max(30 - Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 30, 30), 0).toFixed(0)}%</span>
          </div>

          <div className="mt-3 flex justify-between text-sm mb-1">
            <span className="text-graphite-secondary">Ahorro/Inversión (20%)</span>
            <span>{Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 20, 20).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[var(--border)] rounded-full h-2">
            <div
              className="h-full rounded-tl-md rounded-bl-md bg-[var(--clay)]"
              style={{ width: `${Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 20, 20)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-ashen-secondary">
            <span>{Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 20, 20).toFixed(0)}%</span>
            <span>{Math.max(20 - Math.min((ingresosMes / Math.max(ingresosMes, 1)) * 20, 20), 0).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Charts / Evolution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Patrimonio Evolution */}
        <div className="card-warm shadow-warm p-6">
          <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-4">Evolución del Patrimonio</p>
          <p className="text-sm text-ashen-secondary">(Próximamente - gráfico de línea mensual)</p>
        </div>

        {/* Monthly Breakdown */}
        <div className="card-warm shadow-warm p-6">
          <p className="text-ashen-secondary text-sm uppercase tracking-wider mb-4">Desglose Mensual</p>
          <p className="text-sm text-ashen-secondary">(Próximamente - tabla por mes)</p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
        <button
          onClick={() => { window.location.href = "/ingresos"; }}
          className="btn-primary w-full">
          Agregar Ingreso
        </button>
        <button
          onClick={() => { window.location.href = "/gastos"; }}
          className="btn-primary w-full">
          Agregar Gasto
        </button>
        <button
          onClick={() => { window.location.href = "/carga-rapida"; }}
          className="btn-accent w-full text-[var(--clay)] border border-[var(--clay)]">
          Carga Rápida (Texto/Voz)
        </button>
        <button
          onClick={() => { window.location.href = "/patrimonio"; }}
          className="btn-primary w-full">
          Ver Patrimonio
        </button>
      </div>
    </main>
  );
}