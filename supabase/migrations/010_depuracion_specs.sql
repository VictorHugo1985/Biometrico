-- ============================================================
-- Biometrico — Migración 010: Depuración — Gaps identificados en revisión completa
-- Specs: 013, 015, 006, 010, 014
-- Depende de: 001_schema_completo.sql (todas las tablas afectadas existen desde 001)
-- Puede ejecutarse en paralelo con 003–007 (tablas independientes)
-- ============================================================

-- ============================================================
-- 1. usuarios: flag de contraseña temporal (spec 015 FR-010/FR-011)
-- Al generar contraseña temporal → true; al cambiarla por propia → false.
-- Al iniciar sesión con contrasena_temporal=true, obligar cambio de contraseña
-- antes de permitir cualquier otra acción (enforceado en la capa de aplicación).
-- ============================================================
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS contrasena_temporal BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- 2. colaboradores: unique parcial — solo entre activos (spec 006)
-- Permite dar de baja a un colaborador y registrar un nuevo con el mismo código.
-- Impide duplicados entre colaboradores activos simultáneamente.
-- ============================================================
ALTER TABLE colaboradores
  DROP CONSTRAINT IF EXISTS uq_colaboradores_codigo;

CREATE UNIQUE INDEX IF NOT EXISTS uq_colaboradores_codigo_activo
  ON colaboradores(codigo_empleado)
  WHERE activo = true;


-- ============================================================
-- 3. reglas_nomina: columnas faltantes para cálculo completo
--
-- horas_minimas_transporte (spec 010):
--   Umbral de horas trabajadas en el día para que el sistema sugiera
--   el bono de transporte. Default: 4 horas.
--   Query en eligibilidad.calculator.ts:
--     horas_trabajadas_dia >= regla.horas_minimas_transporte
--
-- descuento_ausencia_injustificada (spec 014 FR-010):
--   Monto fijo en Bs a descontar por cada día de ausencia sin justificación
--   aprobada. Default: 0.00 (sin descuento hasta que el admin lo configure).
-- ============================================================
ALTER TABLE reglas_nomina
  ADD COLUMN IF NOT EXISTS horas_minimas_transporte         NUMERIC(4,2)  NOT NULL DEFAULT 4.00,
  ADD COLUMN IF NOT EXISTS descuento_ausencia_injustificada NUMERIC(10,2) NOT NULL DEFAULT 0.00;


-- ============================================================
-- 4. plantillas_horario: vigencia fechada (spec 013 — Principio III)
-- Las plantillas deben versionarse igual que las reglas_nomina para
-- que los cálculos históricos usen la plantilla vigente en ese período.
-- ============================================================
ALTER TABLE plantillas_horario
  ADD COLUMN IF NOT EXISTS vigente_desde DATE,
  ADD COLUMN IF NOT EXISTS vigente_hasta DATE;

-- Inicializar vigente_desde antes de agregar NOT NULL
UPDATE plantillas_horario
  SET vigente_desde = CURRENT_DATE
  WHERE vigente_desde IS NULL;

ALTER TABLE plantillas_horario
  ALTER COLUMN vigente_desde SET NOT NULL;

ALTER TABLE plantillas_horario
  ADD CONSTRAINT chk_plantilla_vigencia CHECK (
    vigente_hasta IS NULL OR vigente_hasta > vigente_desde
  );
