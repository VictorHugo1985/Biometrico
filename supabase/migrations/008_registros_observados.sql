-- ============================================================
-- Biometrico — Migración 008: Registros Observados y Aprobación
-- Spec: 007-liquidacion-semanal
-- Depende de: 006_fix_periodos.sql (constraint sábado correcto),
--             001_schema_completo.sql (resultados_nomina, usuarios)
-- ============================================================

-- ============================================================
-- 1. ENUMs para registros observados
-- ============================================================
DO $$ BEGIN
  CREATE TYPE tipo_observacion AS ENUM (
    'atraso', 'ausencia', 'salida_anticipada', 'salida_no_registrada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE decision_observacion AS ENUM (
    'pago_completo', 'penalidad_hora', 'penalidad_tarifa'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 2. Tabla registros_observados
-- ============================================================
CREATE TABLE IF NOT EXISTS registros_observados (
  id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_nomina_id UUID                 NOT NULL REFERENCES resultados_nomina(id),
  fecha_referencia    DATE                 NOT NULL,
  tipo_observacion    tipo_observacion     NOT NULL,
  minutos_diferencia  INTEGER,
  decision            decision_observacion,
  valor_penalidad     NUMERIC(10,2),
  justificacion_texto TEXT,
  resuelto_por        UUID                 REFERENCES usuarios(id),
  resuelto_en         TIMESTAMPTZ,
  creado_en           TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_observacion_resultado_fecha_tipo
    UNIQUE (resultado_nomina_id, fecha_referencia, tipo_observacion),
  CONSTRAINT chk_justificacion_penalidad CHECK (
    decision IS NULL
    OR decision = 'pago_completo'
    OR justificacion_texto IS NOT NULL
  ),
  CONSTRAINT chk_penalidad_requiere_valor CHECK (
    decision IS NULL
    OR decision = 'pago_completo'
    OR valor_penalidad IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_observados_resultado
  ON registros_observados(resultado_nomina_id);

CREATE INDEX IF NOT EXISTS idx_observados_pendientes
  ON registros_observados(resultado_nomina_id)
  WHERE decision IS NULL;


-- ============================================================
-- 3. Campos de aprobación en resultados_nomina (spec 007 FR-014)
-- ============================================================
ALTER TABLE resultados_nomina
  ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS aprobado_en  TIMESTAMPTZ;

ALTER TABLE resultados_nomina
  ADD CONSTRAINT chk_aprobacion_completa CHECK (
    estado != 'aprobado'
    OR (aprobado_por IS NOT NULL AND aprobado_en IS NOT NULL)
  );


-- ============================================================
-- 4. CHECK aritmético en lineas_resultado_nomina
-- ============================================================
ALTER TABLE lineas_resultado_nomina
  ADD CONSTRAINT chk_total_linea CHECK (
    total = ROUND(cantidad * valor_unitario, 2)
  );
