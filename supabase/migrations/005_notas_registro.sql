-- ============================================================
-- Biometrico — Migración 005: Notas de Registro Diario
-- Spec: 011-notas-registro-diario
-- Depende de: 004_bonos_diarios.sql (función fn_validar_fecha_en_periodo)
-- ============================================================

-- ============================================================
-- 1. Notas por colaborador por día (máx 1 por día por colaborador)
-- Incluye auditoría completa de edición y eliminación (spec 011 FR-003)
-- ============================================================
CREATE TABLE IF NOT EXISTS notas_asistencia (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  UUID        NOT NULL REFERENCES colaboradores(id),
  periodo_id      UUID        NOT NULL REFERENCES periodos_semanales(id),
  fecha           DATE        NOT NULL,
  comentario      TEXT        CHECK (char_length(comentario) <= 500),
  creado_por      UUID        NOT NULL REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Auditoría de edición (spec 011 FR-003)
  modificado_por  UUID        REFERENCES usuarios(id),
  -- Soft-delete con trazabilidad completa (spec 011 FR-002/FR-003)
  eliminado       BOOLEAN     NOT NULL DEFAULT false,
  eliminado_en    TIMESTAMPTZ,
  eliminado_por   UUID        REFERENCES usuarios(id),
  CONSTRAINT uq_nota_colaborador_fecha UNIQUE (colaborador_id, fecha),
  CONSTRAINT chk_eliminacion_completa CHECK (
    (eliminado = false) OR
    (eliminado = true AND eliminado_en IS NOT NULL AND eliminado_por IS NOT NULL)
  )
);

CREATE OR REPLACE TRIGGER trg_actualizar_notas
BEFORE UPDATE ON notas_asistencia
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();

CREATE OR REPLACE TRIGGER trg_validar_fecha_nota
BEFORE INSERT OR UPDATE ON notas_asistencia
FOR EACH ROW EXECUTE FUNCTION fn_validar_fecha_en_periodo();


-- ============================================================
-- 2. Adjuntos por nota (máx 1 por nota en v1)
-- ============================================================
CREATE TABLE IF NOT EXISTS adjuntos_nota (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id         UUID        NOT NULL REFERENCES notas_asistencia(id) ON DELETE CASCADE,
  nombre_archivo  TEXT        NOT NULL,
  mime_type       TEXT        NOT NULL
    CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf')),
  tamanio_bytes   INTEGER     NOT NULL
    CHECK (tamanio_bytes > 0 AND tamanio_bytes <= 10485760),
  storage_path    TEXT        NOT NULL,
  creado_por      UUID        NOT NULL REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_adjunto_por_nota UNIQUE (nota_id)
);


-- ============================================================
-- 3. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notas_colaborador_fecha
  ON notas_asistencia(colaborador_id, fecha)
  WHERE NOT eliminado;

CREATE INDEX IF NOT EXISTS idx_notas_periodo
  ON notas_asistencia(periodo_id)
  WHERE NOT eliminado;
