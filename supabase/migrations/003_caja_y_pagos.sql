-- ============================================================
-- Biometrico — Migración 003: Caja y Pagos
-- Spec: 012-pago-caja
-- Depende de: 002_correcciones_esquema.sql
-- ============================================================

-- ============================================================
-- 1. Agregar rol 'caja'
-- ============================================================
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'caja';


-- ============================================================
-- 2. ENUM tipo_ajuste_caja (distinto de tipo_ajuste biométrico)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE tipo_ajuste_caja AS ENUM ('descuento', 'incremento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 3. Ajustes de Caja (soft-delete para trazabilidad — Principio VI)
-- ============================================================
CREATE TABLE IF NOT EXISTS ajustes_caja (
  id                   UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_nomina_id  UUID             NOT NULL REFERENCES resultados_nomina(id),
  tipo                 tipo_ajuste_caja NOT NULL,
  monto                NUMERIC(10,2)    NOT NULL CHECK (monto > 0),
  motivo               TEXT             NOT NULL,
  cajero_id            UUID             NOT NULL REFERENCES usuarios(id),
  creado_en            TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  anulado              BOOLEAN          NOT NULL DEFAULT false,
  anulado_en           TIMESTAMPTZ,
  anulado_por          UUID             REFERENCES usuarios(id),
  motivo_anulacion     TEXT,
  CONSTRAINT chk_anulacion_completa CHECK (
    (anulado = false) OR
    (anulado = true AND anulado_en IS NOT NULL AND motivo_anulacion IS NOT NULL)
  )
);


-- ============================================================
-- 4. Confirmación de pago (1:1 con resultado_nomina)
-- ============================================================
CREATE TABLE IF NOT EXISTS confirmaciones_pago (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_nomina_id  UUID          NOT NULL REFERENCES resultados_nomina(id),
  fecha_pago           DATE          NOT NULL,
  monto_pagado         NUMERIC(10,2) NOT NULL CHECK (monto_pagado >= 0),
  metodo_pago          TEXT          NOT NULL DEFAULT 'efectivo',
  motivo_diferencia    TEXT,
  cajero_id            UUID          NOT NULL REFERENCES usuarios(id),
  creado_en            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_confirmacion_resultado UNIQUE (resultado_nomina_id)
);


-- ============================================================
-- 5. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ajustes_caja_resultado
  ON ajustes_caja(resultado_nomina_id) WHERE NOT anulado;

CREATE INDEX IF NOT EXISTS idx_confirmaciones_fecha
  ON confirmaciones_pago(fecha_pago);

CREATE INDEX IF NOT EXISTS idx_resultados_estado
  ON resultados_nomina(estado);
