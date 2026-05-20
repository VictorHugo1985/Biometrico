-- ============================================================
-- Biometrico — Migración 007: Catálogo de Tipos de Justificación
-- Spec: 014-justificaciones-ausencia
-- Depende de: 001_schema_completo.sql (justificaciones)
-- ============================================================

-- ============================================================
-- 1. Catálogo configurable de tipos (fuente de verdad + efecto en pago)
-- ============================================================
CREATE TABLE IF NOT EXISTS tipos_justificacion_catalogo (
  codigo      TEXT        PRIMARY KEY,
  descripcion TEXT        NOT NULL,
  con_pago    BOOLEAN     NOT NULL DEFAULT false,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tipos_justificacion_catalogo (codigo, descripcion, con_pago) VALUES
  ('medica',           'Incapacidad médica',         true),
  ('permiso_aprobado', 'Permiso con pago aprobado',  true),
  ('personal',         'Asunto personal',            false),
  ('otro',             'Otro motivo',                false)
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================
-- 2. Migrar justificaciones: ENUM → FK al catálogo
-- ============================================================
ALTER TABLE justificaciones
  ALTER COLUMN tipo_justificacion TYPE TEXT;

ALTER TABLE justificaciones
  DROP COLUMN IF EXISTS afecta_pago;

ALTER TABLE justificaciones
  ADD CONSTRAINT fk_justificacion_tipo
    FOREIGN KEY (tipo_justificacion)
    REFERENCES tipos_justificacion_catalogo(codigo);

DROP TYPE IF EXISTS tipo_justificacion;


-- ============================================================
-- 3. Campos de aprobación faltantes (spec 014 FR-005/FR-006)
-- ============================================================
ALTER TABLE justificaciones
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
  ADD COLUMN IF NOT EXISTS aprobado_por   UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS aprobado_en    TIMESTAMPTZ;


-- ============================================================
-- 4. Adjunto de justificación (spec 014 FR-004)
-- Inline (no tabla separada) ya que es máx. 1 adjunto por justificación
-- ============================================================
ALTER TABLE justificaciones
  ADD COLUMN IF NOT EXISTS adjunto_path    TEXT,
  ADD COLUMN IF NOT EXISTS adjunto_mime    TEXT
    CHECK (adjunto_mime IS NULL OR
           adjunto_mime IN ('image/jpeg', 'image/png', 'application/pdf')),
  ADD COLUMN IF NOT EXISTS adjunto_tamanio INTEGER
    CHECK (adjunto_tamanio IS NULL OR
           (adjunto_tamanio > 0 AND adjunto_tamanio <= 10485760));


-- ============================================================
-- 5. Unicidad por colaborador/día (spec 014 FR-002)
-- ============================================================
ALTER TABLE justificaciones
  ADD CONSTRAINT uq_justificacion_colaborador_fecha
    UNIQUE (colaborador_id, fecha_ausencia);


-- ============================================================
-- 6. Invariante de ciclo de vida de estado (Principio VI)
-- ============================================================
ALTER TABLE justificaciones
  ADD CONSTRAINT chk_estado_justificacion_completo CHECK (
    estado = 'pendiente'
    OR (estado = 'aprobado'  AND aprobado_por IS NOT NULL AND aprobado_en IS NOT NULL)
    OR (estado = 'rechazado' AND motivo_rechazo IS NOT NULL)
  );


-- ============================================================
-- 7. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_justificaciones_colaborador_fecha
  ON justificaciones(colaborador_id, fecha_ausencia);

CREATE INDEX IF NOT EXISTS idx_justificaciones_periodo_estado
  ON justificaciones(periodo_id, estado);

CREATE INDEX IF NOT EXISTS idx_justificaciones_pendientes
  ON justificaciones(estado)
  WHERE estado = 'pendiente';
