-- Supabase Migration: 20261106_002_ingresos.sql
-- Ingresos: Fecha, Cliente / Fuente, Tipo, Proyecto, Monto, Moneda, Tipo de cambio a ARS, Monto ARS, Cobrado (Sí/No), Mes clave, Notas, Impacta resultados

CREATE TABLE IF NOT EXISTS ingresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  cliente_fuente TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Otro',
  proyecto TEXT,
  monto NUMERIC(15,2) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  tipo_cambio_ars NUMERIC(10,4) DEFAULT 1,
  monto_ars NUMERIC(15,2) GENERATED ALWAYS AS (monto * tipo_cambio_ars) STORED,
  cobrado BOOLEAN NOT NULL DEFAULT FALSE,
  mes_clave TEXT NOT NULL,
  notas TEXT,
  impacta_resultados BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('now'::text, now()),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('now'::text, now())
);