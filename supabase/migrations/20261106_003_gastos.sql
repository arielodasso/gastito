-- Supabase Migration: 20261106_003_gastos.sql
-- Gastos: Fecha, Concepto, Categoría, Tipo 50/30/20, Monto, Moneda, Tipo de cambio, Monto ARS, Medio de pago, Fijo/Variable, Mes clave, Impacta resultados

CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  tipo_503020 TEXT NOT NULL CHECK (tipo_503020 IN ('Necesidades', 'Deseos', 'Ahorro')),
  monto NUMERIC(15,2) NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  tipo_cambio_ars NUMERIC(10,4) DEFAULT 1,
  monto_ars NUMERIC(15,2) GENERATED ALWAYS AS (monto * tipo_cambio_ars) STORED,
  medio_pago TEXT NOT NULL DEFAULT 'Efectivo' CHECK (medio_pago IN ('Efectivo', 'Débito', 'Transferencia', 'Tarjeta Crédito', 'Cheque', 'Otro')),
  fijo_variable TEXT NOT NULL DEFAULT 'Variable' CHECK (fijo_variable IN ('Fijo', 'Variable')),
  mes_clave TEXT NOT NULL,
  impacta_resultados BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('now'::text, now()),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('now'::text, now())
);