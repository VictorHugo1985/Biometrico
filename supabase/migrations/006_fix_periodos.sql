-- ============================================================
-- Biometrico — Migración 006: Fix Períodos y Auditoría
-- Spec: 007-liquidacion-semanal
-- Depende de: 001_schema_completo.sql
-- Bloquea: 008_registros_observados.sql
-- ============================================================

-- ============================================================
-- 1. Corregir constraint de día de inicio
-- 001 lo creó como DOW=1 (lunes); spec 007 define semana sábado–viernes (DOW=6)
-- ============================================================
ALTER TABLE periodos_semanales
  DROP CONSTRAINT IF EXISTS chk_inicio_lunes;

ALTER TABLE periodos_semanales
  ADD CONSTRAINT chk_inicio_sabado
    CHECK (EXTRACT(DOW FROM inicio_periodo) = 6);


-- ============================================================
-- 2. Agregar creado_por (faltaba en el esquema base)
-- ============================================================
ALTER TABLE periodos_semanales
  ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES usuarios(id);
