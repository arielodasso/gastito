-- Supabase Migration: 20261106_001_configuracion_parametros.sql
-- Configuración/Parámetros: Regla 50/30/20

CREATE TABLE IF NOT EXISTS configuracion_parametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  porcentaje_necesidades NUMERIC(5,2) NOT NULL DEFAULT 0.5,
  porcentaje_deseos NUMERIC(5,2) NOT NULL DEFAULT 0.3,
  porcentaje_ahorro NUMERIC(5,2) NOT NULL DEFAULT 0.2,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default 50/30/20 rule
INSERT INTO configuracion_parametros (porcentaje_necesidades, porcentaje_deseos, porcentaje_ahorro)
VALUES (0.5, 0.3, 0.2)
ON CONFLICT DO NOTHING;
