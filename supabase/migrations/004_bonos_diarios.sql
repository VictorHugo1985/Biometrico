-- ============================================================
-- Biometrico — Migración 004: Bonos Diarios
-- Spec: 010-bonos-diarios
-- Depende de: 001_schema_completo.sql (colaboradores, periodos_semanales, usuarios)
-- ============================================================

-- ============================================================
-- 1. ENUMs para estados de cada tipo de bono
-- ============================================================
DO $$ BEGIN
  CREATE TYPE estado_bono_transporte AS ENUM (
    'elegible', 'no_elegible', 'confirmado', 'rechazado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_bono_alimentacion AS ENUM (
    'no_agregado', 'pendiente', 'confirmado', 'rechazado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 2. Tabla bonos_diarios
-- ============================================================
CREATE TABLE IF NOT EXISTS bonos_diarios (
  id                    UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id        UUID                     NOT NULL REFERENCES colaboradores(id),
  periodo_id            UUID                     NOT NULL REFERENCES periodos_semanales(id),
  fecha                 DATE                     NOT NULL,
  -- Transporte: sugerido por el sistema según horas trabajadas
  estado_transporte     estado_bono_transporte   NOT NULL DEFAULT 'no_elegible',
  monto_transporte      NUMERIC(10,2),
  horas_trabajadas_dia  NUMERIC(4,2),
  -- Alimentación: el supervisor lo agrega manualmente (spec 010)
  estado_alimentacion   estado_bono_alimentacion NOT NULL DEFAULT 'no_agregado',
  monto_alimentacion    NUMERIC(10,2),
  -- Auditoría (Principio VI)
  gestionado_por        UUID                     REFERENCES usuarios(id),
  gestionado_en         TIMESTAMPTZ,
  motivo_rechazo        TEXT,
  creado_en             TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bono_colaborador_fecha UNIQUE (colaborador_id, fecha)
);


-- ============================================================
-- 3. Función y trigger: fecha pertenece a periodo_id
-- ============================================================
CREATE OR REPLACE FUNCTION fn_validar_fecha_en_periodo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_inicio DATE;
  v_fin    DATE;
BEGIN
  SELECT inicio_periodo, fin_periodo
    INTO v_inicio, v_fin
    FROM periodos_semanales
   WHERE id = NEW.periodo_id;

  IF v_inicio IS NULL THEN
    RAISE EXCEPTION 'periodo_id % no existe', NEW.periodo_id;
  END IF;

  IF NEW.fecha NOT BETWEEN v_inicio AND v_fin THEN
    RAISE EXCEPTION 'fecha % no pertenece al periodo % (% a %)',
      NEW.fecha, NEW.periodo_id, v_inicio, v_fin;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_validar_fecha_bono
BEFORE INSERT OR UPDATE ON bonos_diarios
FOR EACH ROW EXECUTE FUNCTION fn_validar_fecha_en_periodo();


-- ============================================================
-- 4. Normalización: eliminar totales cacheados de resultados_nomina
-- Fuente de verdad → bonos_diarios WHERE estado IN ('confirmado')
-- ============================================================
ALTER TABLE resultados_nomina
  DROP COLUMN IF EXISTS total_bono_transporte,
  DROP COLUMN IF EXISTS total_bono_alimentacion;


-- ============================================================
-- 5. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bonos_periodo_colaborador
  ON bonos_diarios(periodo_id, colaborador_id);

CREATE INDEX IF NOT EXISTS idx_bonos_pendientes_transporte
  ON bonos_diarios(periodo_id, estado_transporte)
  WHERE estado_transporte IN ('elegible', 'no_elegible');

CREATE INDEX IF NOT EXISTS idx_bonos_pendientes_alimentacion
  ON bonos_diarios(periodo_id, estado_alimentacion)
  WHERE estado_alimentacion IN ('no_agregado', 'pendiente');
