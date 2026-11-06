-- Supabase Migration: 20261106_001_configuracion_parámetros.sql
-- Configuración/Parámetros: Regla 50/30/20

CREATE TABLE IF NOT EXISTS configuracion_parametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  porcentaje_necidades NUMERIC(5,2) NOT NULL DEFAULT 0.5,
  porcentaje_deseos NUMERIC(5,2) NOT NULL DEFAULT 0.3,
  porcentaje_ahorro NUMERIC(5,2) NOT NULL DEFAULT 0.2,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('now'::text, now()),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('now'::text, now())
);

-- Insert default 50/30/20 rule
INSERT INTO configuracion_parametros (porcentaje_necidades, porcentaje_deseos, porcentaje_ahorro)
VALUES (0.5, 0.3, 0.2)
ON CONFLICT DO NOTHING;