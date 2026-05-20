-- ============================================================
-- Biometrico — Migración 002: Correcciones al esquema base
-- Spec: 005 (correcciones), 003 (flujo aprobación), 007 (estados)
-- Depende de: 001_schema_completo.sql
-- ============================================================

-- ============================================================
-- 1. estado_resultado: agregar 'en_revision' (faltante en spec 007)
-- El ciclo de vida completo es: borrador → en_revision → aprobado
-- ============================================================
ALTER TYPE estado_resultado ADD VALUE IF NOT EXISTS 'en_revision' BEFORE 'aprobado';


-- ============================================================
-- 2. tokens_api_externa: conectar a la lógica del sistema
-- Era tabla aislada sin trazabilidad de quién creó el token
-- ============================================================
ALTER TABLE tokens_api_externa
  ADD COLUMN IF NOT EXISTS descripcion TEXT NOT NULL DEFAULT 'CrossChex API',
  ADD COLUMN IF NOT EXISTS creado_por  UUID REFERENCES usuarios(id);


-- ============================================================
-- 3. auditoria_webhooks: protección contra duplicados silenciosos
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_auditoria_id_solicitud
  ON auditoria_webhooks(id_solicitud_crosschex)
  WHERE id_solicitud_crosschex IS NOT NULL;


-- ============================================================
-- 4. ajustes_biometricos: hora_marcacion_ajustada requiere CHECK
-- Para 'correccion' y 'adicion' el campo es obligatorio.
-- Para 'marca_eliminacion' no aplica (debe ser NULL).
-- ============================================================
ALTER TABLE ajustes_biometricos
  ADD CONSTRAINT chk_hora_ajustada_requerida CHECK (
    tipo_ajuste = 'marca_eliminacion' OR hora_marcacion_ajustada IS NOT NULL
  );


-- ============================================================
-- 5. registros_aprobacion: reemplazar FK polimórfico por tablas concretas
-- ============================================================

CREATE TABLE IF NOT EXISTS aprobaciones_ajuste_biometrico (
  id           UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  ajuste_id    UUID                NOT NULL REFERENCES ajustes_biometricos(id),
  decision     decision_aprobacion NOT NULL,
  notas        TEXT,
  decidido_por UUID                NOT NULL REFERENCES usuarios(id),
  decidido_en  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aprobaciones_justificacion (
  id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  justificacion_id UUID                NOT NULL REFERENCES justificaciones(id),
  decision         decision_aprobacion NOT NULL,
  notas            TEXT,
  decidido_por     UUID                NOT NULL REFERENCES usuarios(id),
  decidido_en      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Migrar datos existentes (si los hay)
INSERT INTO aprobaciones_ajuste_biometrico (ajuste_id, decision, notas, decidido_por, decidido_en)
  SELECT entidad_id, decision, notas, decidido_por, decidido_en
  FROM registros_aprobacion
  WHERE tipo_entidad = 'ajuste_biometrico'
  ON CONFLICT DO NOTHING;

INSERT INTO aprobaciones_justificacion (justificacion_id, decision, notas, decidido_por, decidido_en)
  SELECT entidad_id, decision, notas, decidido_por, decidido_en
  FROM registros_aprobacion
  WHERE tipo_entidad = 'justificacion'
  ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS registros_aprobacion;
DROP TYPE IF EXISTS tipo_entidad_aprobacion;

CREATE INDEX IF NOT EXISTS idx_aprobaciones_ajuste
  ON aprobaciones_ajuste_biometrico(ajuste_id);

CREATE INDEX IF NOT EXISTS idx_aprobaciones_justificacion
  ON aprobaciones_justificacion(justificacion_id);
