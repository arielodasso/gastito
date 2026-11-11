-- Supabase Migration: 20261106_004_patrimonio.sql
-- Patrimonio y Resumen: Evolución mensual (Patrimonio inicial, Ingresos, Gastos, Patrimonio final) y cumplimiento regla 50/30/20

CREATE TABLE IF NOT EXISTS patrimonio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_clave TEXT NOT NULL,
  ano INTEGER NOT NULL,
  mes_numero INTEGER NOT NULL CHECK (mes_numero BETWEEN 1 AND 12),
  patrimonio_inicial_ars NUMERIC(15,2) NOT NULL DEFAULT 0,
  ingresos_mes_ars NUMERIC(15,2) NOT NULL DEFAULT 0,
  gastos_mes_ars NUMERIC(15,2) NOT NULL DEFAULT 0,
  patrimonio_final_ars NUMERIC(15,2) GENERATED ALWAYS AS (patrimonio_inicial_ars + ingresos_mes_ars - gastos_mes_ars) STORED,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Resumen de cumplimiento 50/30/20 por mes
CREATE TABLE IF NOT EXISTS resumen_503020 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_clave TEXT NOT NULL,
  ano INTEGER NOT NULL,
  mes_numero INTEGER NOT NULL CHECK (mes_numero BETWEEN 1 AND 12),
  necesita_asignado NUMERIC(15,2) NOT NULL DEFAULT 0,
  deseo_asignado NUMERIC(15,2) NOT NULL DEFAULT 0,
  ahorro_asignado NUMERIC(15,2) NOT NULL DEFAULT 0,
  necesidad_gasto NUMERIC(15,2) NOT NULL DEFAULT 0,
  deseo_gasto NUMERIC(15,2) NOT NULL DEFAULT 0,
  ahorro_gasto NUMERIC(15,2) NOT NULL DEFAULT 0,
  cumplimiento_nec_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  cumplimiento_des_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  cumplimiento_ahorro_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);
