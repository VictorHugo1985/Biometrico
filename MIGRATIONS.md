# MIGRATIONS — Biometrico

Orden canónico de ejecución de migraciones de base de datos.
Respetar la secuencia estrictamente: las FK y los ENUMs exigen que las tablas y valores previos existan.

**Convención de nombres**: `NNN_descripcion_breve.sql`
**Directorio**: `supabase/migrations/`
**Entorno de prueba**: ejecutar contra instancia local o branch de Supabase antes de aplicar en producción.

---

## Estado actual

| # | Archivo | Specs | Estado | Contenido |
|---|---------|-------|--------|-----------|
| 001 | `001_schema_completo.sql` | 005 | ✅ Aplicada | Esquema base — 21 tablas, 14 ENUMs |
| 002 | `002_correcciones_esquema.sql` | 005, 003, 007 | ⏳ Pendiente | Fixes de integridad al esquema base |
| 003 | `003_caja_y_pagos.sql` | 012 | ⏳ Pendiente | Rol caja, ajustes y confirmaciones de pago |
| 004 | `004_bonos_diarios.sql` | 010 | ⏳ Pendiente | Bonos diarios, normalización de totales |
| 005 | `005_notas_registro.sql` | 011 | ⏳ Pendiente | Notas de asistencia y adjuntos (con soft-delete) |
| 006 | `006_fix_periodos.sql` | 007 | ⏳ Pendiente | Constraint sábado + campo auditoría |
| 007 | `007_justificaciones_catalogo.sql` | 014 | ⏳ Pendiente | Catálogo de tipos + normalización + aprobación + adjunto |
| 008 | `008_registros_observados.sql` | 007 | ⏳ Pendiente | Observados, penalidades, campos aprobación |
| 009 | `009_indices.sql` | todos | ⏳ Pendiente | Índices de performance faltantes |
| 010 | `010_depuracion_specs.sql` | 013, 015, 006, 010, 014 | ⏳ Pendiente | Gaps identificados en revisión completa de specs |

**Orden mínimo seguro**: `001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010`

Las migraciones 003, 004 y 005 son independientes entre sí (pueden ejecutarse en cualquier orden
relativo después de 002). La 006 debe ir antes de 008. La 007 es independiente de 006.
La 010 depende de que todas las tablas afectadas (plantillas_horario, reglas_nomina, colaboradores,
usuarios) existan — puede ejecutarse después de 001.

---

## Detalle por migración

---

### 001 — Esquema completo base (`001_schema_completo.sql`)

**Spec**: 005-db-data-dictionary
**Aplicada**: 2026-05-19

**Tablas creadas** (por wave de dependencia FK):

| Wave | Tablas |
|------|--------|
| 1 — sin FK | `tipos_verificacion`, `usuarios`, `departamentos`, `tokens_api_externa` |
| 2 | `dispositivos_biometricos`, `colaboradores`, `sesiones_usuario`, `tokens_recuperacion`, `intentos_login`, `plantillas_horario`, `reglas_nomina`, `periodos_semanales`, `registros_aprobacion` |
| 3 | `asignaciones_horario`, `asignaciones_regla_nomina`, `eventos_biometricos`, `resultados_nomina` |
| 4 | `ajustes_biometricos`, `auditoria_webhooks`, `justificaciones` |
| 5 | `lineas_resultado_nomina` |

**ENUMs**: `rol_usuario`, `estado_sesion`, `estado_token`, `origen_evento`, `tipo_ajuste`,
`estado_ajuste`, `estado_periodo`, `estado_resultado`, `tipo_linea_nomina`, `tipo_justificacion`,
`estado_justificacion`, `tipo_entidad_aprobacion`, `decision_aprobacion`, `estado_procesamiento_webhook`

**Problemas conocidos corregidos en 002**:
- `tokens_api_externa` sin `creado_por` ni descripción — tabla aislada
- `registros_aprobacion` usa FK polimórfico sin enforcement de DB
- `estado_resultado` falta valor 'en_revision' (spec 007 define 3 estados)
- `ajustes_biometricos.hora_marcacion_ajustada` nullable sin restricción por tipo
- `auditoria_webhooks.id_solicitud_crosschex` es nullable sin protección
- `periodos_semanales.chk_inicio_lunes` (DOW=1) contradice spec 007 (sábado = DOW=6)

---

### 002 — Correcciones al esquema base (`002_correcciones_esquema.sql`)

**Specs**: 005 (correcciones), 003 (flujo aprobación), 007 (estados)
**Depende de**: 001
**Bloquea**: todas las demás migraciones

Consolida los fixes de integridad identificados en la revisión de normalización. Debe ejecutarse
antes que cualquier otra migración para que el esquema base sea correcto.

```sql
-- ============================================================
-- 1. estado_resultado: agregar 'en_revision' (faltante en spec 007)
-- El ciclo de vida completo es: borrador → en_revision → aprobado
-- ============================================================
-- IMPORTANTE: ejecutar fuera de bloque BEGIN/COMMIT explícito en PG < 12
ALTER TYPE estado_resultado ADD VALUE IF NOT EXISTS 'en_revision' BEFORE 'aprobado';


-- ============================================================
-- 2. tokens_api_externa: conectar a la lógica del sistema
-- Era tabla aislada sin trazabilidad de quién creó el token
-- ============================================================
ALTER TABLE tokens_api_externa
  ADD COLUMN IF NOT EXISTS descripcion TEXT NOT NULL DEFAULT 'CrossChex API',
  ADD COLUMN IF NOT EXISTS creado_por  UUID REFERENCES usuarios(id);


-- ============================================================
-- 3. auditoria_webhooks: id_solicitud_crosschex debe ser identificable
-- Sin índice único, no hay protección contra duplicados silenciosos
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
-- El patrón polimórfico (tipo_entidad + entidad_id) no tiene enforcement
-- de FK a nivel de DB. Se divide en dos tablas con FK reales.
-- ============================================================

-- 5a. Crear tablas concretas con FK reales
CREATE TABLE IF NOT EXISTS aprobaciones_ajuste_biometrico (
  id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  ajuste_id   UUID                NOT NULL REFERENCES ajustes_biometricos(id),
  decision    decision_aprobacion NOT NULL,
  notas       TEXT,
  decidido_por UUID               NOT NULL REFERENCES usuarios(id),
  decidido_en  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aprobaciones_justificacion (
  id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  justificacion_id UUID                NOT NULL REFERENCES justificaciones(id),
  decision         decision_aprobacion NOT NULL,
  notas            TEXT,
  decidido_por     UUID                NOT NULL REFERENCES usuarios(id),
  decidido_en      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- 5b. Migrar datos existentes (si los hay)
INSERT INTO aprobaciones_ajuste_biometrico (ajuste_id, decision, notas, decidido_por, decidido_en)
  SELECT entidad_id, decision, notas, decidido_por, decidido_en
  FROM registros_aprobacion
  WHERE tipo_entidad = 'ajuste_biometrico';

INSERT INTO aprobaciones_justificacion (justificacion_id, decision, notas, decidido_por, decidido_en)
  SELECT entidad_id, decision, notas, decidido_por, decidido_en
  FROM registros_aprobacion
  WHERE tipo_entidad = 'justificacion';

-- 5c. Eliminar tabla y ENUM polimórficos
DROP TABLE IF EXISTS registros_aprobacion;
DROP TYPE IF EXISTS tipo_entidad_aprobacion;
-- decision_aprobacion se conserva (usado por las nuevas tablas)

-- 5d. Índices en las nuevas tablas
CREATE INDEX IF NOT EXISTS idx_aprobaciones_ajuste
  ON aprobaciones_ajuste_biometrico(ajuste_id);

CREATE INDEX IF NOT EXISTS idx_aprobaciones_justificacion
  ON aprobaciones_justificacion(justificacion_id);
```

---

### 003 — Caja y pagos (`003_caja_y_pagos.sql`)

**Spec**: 012-pago-caja
**Depende de**: 002 (necesita `estado_resultado` con 'en_revision', `rol_usuario` puede extenderse aquí)
**Bloquea**: implementación de spec 012 y spec 015

```sql
-- ============================================================
-- 1. Agregar rol 'caja' (ejecutar antes que las tablas que lo usan)
-- ============================================================
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'caja';


-- ============================================================
-- 2. Enum para tipo de ajuste de Caja
-- Distinto de tipo_ajuste biométrico (correccion/adicion/marca_eliminacion)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE tipo_ajuste_caja AS ENUM ('descuento', 'incremento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 3. Ajustes de Caja sobre resultados aprobados
-- Soft-delete (anulado) para preservar trazabilidad (Principio VI)
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
-- La existencia de un registro = estado "pagado" (sin columna estado extra)
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
```

> **⚠️ Nota sobre `ALTER TYPE ... ADD VALUE`**: En Supabase (PG 17) se permite dentro de transacciones, pero si hay tablas activas con esa columna puede requerir un `COMMIT` previo. Ejecutar la sentencia `ALTER TYPE` en un paso separado si falla por dependencias activas.

---

### 004 — Bonos diarios (`004_bonos_diarios.sql`)

**Spec**: 010-bonos-diarios
**Depende de**: 001 (`colaboradores`, `periodos_semanales`, `usuarios`)
**Bloquea**: spec 010, integración de bonos en spec 007

Incluye la normalización de `resultados_nomina`: los totales de bonos se eliminan como columnas
cacheadas y pasan a calcularse siempre por JOIN sobre `bonos_diarios`, que es la fuente de verdad.

```sql
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
-- Un registro por colaborador por día; bono transporte = sugerido
-- por sistema; bono alimentación = solo supervisor agrega
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
  -- Alimentación: el supervisor lo agrega manualmente
  estado_alimentacion   estado_bono_alimentacion NOT NULL DEFAULT 'no_agregado',
  monto_alimentacion    NUMERIC(10,2),
  -- Auditoría
  gestionado_por        UUID                     REFERENCES usuarios(id),
  gestionado_en         TIMESTAMPTZ,
  motivo_rechazo        TEXT,
  creado_en             TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_bono_colaborador_fecha UNIQUE (colaborador_id, fecha)
);


-- ============================================================
-- 3. Función y trigger para validar que fecha pertenece a periodo_id
-- Evita inconsistencias entre fecha y periodo_id en tablas que tienen ambos
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
-- 4. Normalización: eliminar totales de bonos cacheados en resultados_nomina
-- Fuente de verdad → bonos_diarios WHERE estado IN ('confirmado')
-- Eliminar las columnas evita valores stale al confirmar/rechazar bonos
-- después de generada la liquidación
-- ============================================================
ALTER TABLE resultados_nomina
  DROP COLUMN IF EXISTS total_bono_transporte,
  DROP COLUMN IF EXISTS total_bono_alimentacion;

-- NOTA: la query de totales de bonos para un resultado_nomina es:
-- SELECT
--   COALESCE(SUM(monto_transporte)   FILTER (WHERE estado_transporte  = 'confirmado'), 0) AS total_transporte,
--   COALESCE(SUM(monto_alimentacion) FILTER (WHERE estado_alimentacion = 'confirmado'), 0) AS total_alimentacion
-- FROM bonos_diarios
-- WHERE colaborador_id = $1 AND periodo_id = $2;


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
```

---

### 005 — Notas de registro diario (`005_notas_registro.sql`)

**Spec**: 011-notas-registro-diario
**Depende de**: 004 (función `fn_validar_fecha_en_periodo` ya existe)
**Bloquea**: implementación de spec 011

```sql
-- ============================================================
-- 1. Notas por colaborador por día (máx 1 por día por colaborador)
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
  -- Auditoría de edición y eliminación (spec 011 FR-003)
  modificado_por  UUID        REFERENCES usuarios(id),
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

-- Reutilizar la función de validación de periodo ya creada en 004
CREATE OR REPLACE TRIGGER trg_validar_fecha_nota
BEFORE INSERT OR UPDATE ON notas_asistencia
FOR EACH ROW EXECUTE FUNCTION fn_validar_fecha_en_periodo();


-- ============================================================
-- 2. Adjuntos por nota (máx 1 por nota en v1; UNIQUE en nota_id)
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
  CONSTRAINT uq_adjunto_por_nota UNIQUE (nota_id)  -- máx 1 adjunto por nota en v1
);


-- ============================================================
-- 3. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notas_colaborador_fecha
  ON notas_asistencia(colaborador_id, fecha);

CREATE INDEX IF NOT EXISTS idx_notas_periodo
  ON notas_asistencia(periodo_id);
```

---

### 006 — Fix períodos y auditoría (`006_fix_periodos.sql`)

**Spec**: 007-liquidacion-semanal
**Depende de**: 001
**Bloquea**: 008 (registros_observados necesita periodos correctos)

Corrige el constraint de día de inicio de período y agrega campo de auditoría faltante.

```sql
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
-- Todas las demás tablas registran quién creó el registro
-- ============================================================
ALTER TABLE periodos_semanales
  ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES usuarios(id);
```

> **⚠️ Advertencia**: Si existen registros en `periodos_semanales` con `inicio_periodo` en lunes
> (de pruebas o seed data), el `ADD CONSTRAINT` fallará. Verificar antes:
> ```sql
> SELECT inicio_periodo, EXTRACT(DOW FROM inicio_periodo) AS dow
> FROM periodos_semanales;
> -- DOW debe ser 6 (sábado) para todos los registros
> ```

---

### 007 — Catálogo de tipos de justificación (`007_justificaciones_catalogo.sql`)

**Spec**: 014-justificaciones-ausencia
**Depende de**: 001 (`justificaciones`)
**Bloquea**: implementación de spec 014

Reemplaza el ENUM `tipo_justificacion` por una FK a un catálogo configurable. Elimina la columna
`afecta_pago` de `justificaciones` porque es información del tipo, no de la instancia (evita
duplicación de fuente de verdad).

```sql
-- ============================================================
-- 1. Crear el catálogo (fuente de verdad para tipos y su efecto en pago)
-- ============================================================
CREATE TABLE IF NOT EXISTS tipos_justificacion_catalogo (
  codigo      TEXT        PRIMARY KEY,
  descripcion TEXT        NOT NULL,
  con_pago    BOOLEAN     NOT NULL DEFAULT false,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: los mismos valores que tenía el ENUM, con su efecto en pago
INSERT INTO tipos_justificacion_catalogo (codigo, descripcion, con_pago) VALUES
  ('medica',           'Incapacidad médica',         true),
  ('permiso_aprobado', 'Permiso con pago aprobado',  true),
  ('personal',         'Asunto personal',            false),
  ('otro',             'Otro motivo',                false)
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================
-- 2. Migrar justificaciones para usar FK al catálogo
-- ============================================================

-- 2a. Convertir columna ENUM a TEXT para poder hacer la migración
ALTER TABLE justificaciones
  ALTER COLUMN tipo_justificacion TYPE TEXT;

-- 2b. Eliminar afecta_pago (derivable del catálogo via JOIN)
-- El valor correcto siempre es: tipos_justificacion_catalogo.con_pago
-- WHERE codigo = justificaciones.tipo_justificacion
ALTER TABLE justificaciones
  DROP COLUMN IF EXISTS afecta_pago;

-- 2c. Agregar FK al catálogo
ALTER TABLE justificaciones
  ADD CONSTRAINT fk_justificacion_tipo
    FOREIGN KEY (tipo_justificacion)
    REFERENCES tipos_justificacion_catalogo(codigo);

-- 2d. Eliminar el ENUM original (ya no tiene referencias)
DROP TYPE IF EXISTS tipo_justificacion;


-- ============================================================
-- 3. Campos de aprobación faltantes en justificaciones (spec 014 FR-005/FR-006)
-- Estaban ausentes en el esquema base (001)
-- ============================================================
ALTER TABLE justificaciones
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
  ADD COLUMN IF NOT EXISTS aprobado_por   UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS aprobado_en    TIMESTAMPTZ;

-- Adjunto de justificación (spec 014 FR-004 — mismo estándar que notas)
ALTER TABLE justificaciones
  ADD COLUMN IF NOT EXISTS adjunto_path    TEXT,
  ADD COLUMN IF NOT EXISTS adjunto_mime    TEXT
    CHECK (adjunto_mime IS NULL OR adjunto_mime IN ('image/jpeg', 'image/png', 'application/pdf')),
  ADD COLUMN IF NOT EXISTS adjunto_tamanio INTEGER
    CHECK (adjunto_tamanio IS NULL OR (adjunto_tamanio > 0 AND adjunto_tamanio <= 10485760));

-- Una justificación por colaborador por día (spec 014 FR-002)
ALTER TABLE justificaciones
  ADD CONSTRAINT uq_justificacion_colaborador_fecha
    UNIQUE (colaborador_id, fecha_ausencia);

-- Invariante de ciclo de vida del estado (Principio VI)
ALTER TABLE justificaciones
  ADD CONSTRAINT chk_estado_justificacion_completo CHECK (
    estado = 'pendiente'
    OR (estado = 'aprobado'  AND aprobado_por IS NOT NULL AND aprobado_en IS NOT NULL)
    OR (estado = 'rechazado' AND motivo_rechazo IS NOT NULL)
  );


-- ============================================================
-- 4. Query para obtener si una justificación afecta el pago:
-- SELECT j.*, tjc.con_pago
-- FROM justificaciones j
-- JOIN tipos_justificacion_catalogo tjc ON tjc.codigo = j.tipo_justificacion
-- WHERE j.id = $1;
-- ============================================================
```

---

### 008 — Registros observados y campos de aprobación (`008_registros_observados.sql`)

**Spec**: 007-liquidacion-semanal
**Depende de**: 006 (periodos con constraint correcto), 001 (`resultados_nomina`, `usuarios`)
**Bloquea**: implementación completa del flujo de liquidación

```sql
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
-- 2. Tabla de registros observados
-- Un registro por desvío identificado (puede haber varios por día si
-- el colaborador tiene atraso Y salida anticipada el mismo día)
-- ============================================================
CREATE TABLE IF NOT EXISTS registros_observados (
  id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_nomina_id UUID                 NOT NULL REFERENCES resultados_nomina(id),
  fecha_referencia    DATE                 NOT NULL,
  tipo_observacion    tipo_observacion     NOT NULL,
  minutos_diferencia  INTEGER,
  decision            decision_observacion,
  valor_penalidad     NUMERIC(10,2),
  -- valor_penalidad es:
  --   penalidad_hora   → valor Bs/hora alternativo para esa hora específica
  --   penalidad_tarifa → nueva tarifa Bs/hora para TODO el período del colaborador
  --   pago_completo    → NULL (sin penalidad)
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
-- 3. Campos de aprobación en resultados_nomina
-- Spec 007 FR-014: "registrar quién aprobó cada liquidación y cuándo"
-- ============================================================
ALTER TABLE resultados_nomina
  ADD COLUMN IF NOT EXISTS aprobado_por UUID REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS aprobado_en  TIMESTAMPTZ;

-- Invariante: si estado = 'aprobado', ambos campos deben estar poblados
ALTER TABLE resultados_nomina
  ADD CONSTRAINT chk_aprobacion_completa CHECK (
    estado != 'aprobado'
    OR (aprobado_por IS NOT NULL AND aprobado_en IS NOT NULL)
  );


-- ============================================================
-- 4. CHECK de consistencia aritmética en lineas_resultado_nomina
-- total = ROUND(cantidad * valor_unitario, 2) evita líneas con total incorrecto
-- ============================================================
ALTER TABLE lineas_resultado_nomina
  ADD CONSTRAINT chk_total_linea CHECK (
    total = ROUND(cantidad * valor_unitario, 2)
  );
```

---

### 009 — Índices de performance (`009_indices.sql`)

**Specs**: todos
**Depende de**: 008 (todas las tablas deben existir)
**Bloquea**: nada funcional, pero recomendado antes de carga de datos real

Índices para las queries más frecuentes del sistema identificadas en el análisis.

```sql
-- ============================================================
-- Asignaciones vigentes hoy
-- Query: WHERE colaborador_id = $1 AND vigente_desde <= $fecha
--        AND (vigente_hasta IS NULL OR vigente_hasta >= $fecha)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_asignaciones_horario_vigencia
  ON asignaciones_horario(colaborador_id, vigente_desde, vigente_hasta);

CREATE INDEX IF NOT EXISTS idx_asignaciones_horario_depto_vigencia
  ON asignaciones_horario(departamento_id, vigente_desde, vigente_hasta)
  WHERE departamento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asignaciones_nomina_vigencia
  ON asignaciones_regla_nomina(colaborador_id, vigente_desde, vigente_hasta);

CREATE INDEX IF NOT EXISTS idx_asignaciones_nomina_depto_vigencia
  ON asignaciones_regla_nomina(departamento_id, vigente_desde, vigente_hasta)
  WHERE departamento_id IS NOT NULL;


-- ============================================================
-- Dashboard: estado de asistencia del día por área
-- Query: colaboradores con eventos hoy, agrupados por departamento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_eventos_hora_colaborador
  ON eventos_biometricos(hora_marcacion, colaborador_id);

CREATE INDEX IF NOT EXISTS idx_colaboradores_departamento_activo
  ON colaboradores(departamento_id, activo);


-- ============================================================
-- Caja: cola de resultados pendientes de pago
-- Query: resultados_nomina WHERE estado = 'aprobado' y sin confirmacion_pago
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_resultados_periodo_estado
  ON resultados_nomina(periodo_id, estado);

CREATE INDEX IF NOT EXISTS idx_resultados_colaborador_estado
  ON resultados_nomina(colaborador_id, estado);


-- ============================================================
-- Justificaciones por colaborador y fecha (frecuente en liquidación y dashboard)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_justificaciones_colaborador_fecha
  ON justificaciones(colaborador_id, fecha_ausencia);

CREATE INDEX IF NOT EXISTS idx_justificaciones_periodo_estado
  ON justificaciones(periodo_id, estado);


-- ============================================================
-- Reglas de nómina vigentes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reglas_nomina_vigencia
  ON reglas_nomina(vigente_desde, vigente_hasta)
  WHERE activo = true;
```

---

### 010 — Depuración de gaps identificados en revisión completa (`010_depuracion_specs.sql`)

**Specs**: 013 (configuración), 015 (gestión usuarios), 006 (colaboradores), 010 (bonos), 014 (justificaciones)
**Depende de**: 001 (todas las tablas afectadas existen desde 001)
**Bloquea**: nada funcional; mejora la integridad y completitud del esquema

Corrige todos los gaps estructurales identificados al cruzar el esquema base con las specs completas.

```sql
-- ============================================================
-- 1. usuarios: flag de contraseña temporal (spec 015 FR-010/FR-011)
-- Al generar contraseña temporal, marcar true; al cambiar, marcar false.
-- Al iniciar sesión con temporal=true, obligar cambio antes de cualquier acción.
-- ============================================================
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS contrasena_temporal BOOLEAN NOT NULL DEFAULT false;


-- ============================================================
-- 2. colaboradores: unique parcial — solo entre activos (spec 006)
-- Permite reutilizar código_empleado si el colaborador es dado de baja;
-- impide duplicados entre colaboradores activos.
-- ============================================================
ALTER TABLE colaboradores
  DROP CONSTRAINT IF EXISTS uq_colaboradores_codigo;

CREATE UNIQUE INDEX IF NOT EXISTS uq_colaboradores_codigo_activo
  ON colaboradores(codigo_empleado)
  WHERE activo = true;


-- ============================================================
-- 3. reglas_nomina: columnas faltantes (spec 010 + spec 014)
-- horas_minimas_transporte: umbral de horas trabajadas para elegibilidad
--   de bono transporte (spec 010 eligibilidad.calculator.ts)
-- descuento_ausencia_injustificada: monto Bs a descontar por ausencia
--   sin justificación aprobada (spec 014 FR-010)
-- ============================================================
ALTER TABLE reglas_nomina
  ADD COLUMN IF NOT EXISTS horas_minimas_transporte         NUMERIC(4,2) NOT NULL DEFAULT 4.00,
  ADD COLUMN IF NOT EXISTS descuento_ausencia_injustificada NUMERIC(10,2) NOT NULL DEFAULT 0.00;


-- ============================================================
-- 4. plantillas_horario: vigencia fechada (spec 013 Principio III)
-- Las plantillas deben versionarse igual que las reglas_nomina;
-- los cálculos históricos deben usar la plantilla vigente en ese período.
-- ============================================================
ALTER TABLE plantillas_horario
  ADD COLUMN IF NOT EXISTS vigente_desde DATE,
  ADD COLUMN IF NOT EXISTS vigente_hasta DATE;

-- Inicializar vigente_desde en plantillas existentes antes de agregar NOT NULL
UPDATE plantillas_horario
  SET vigente_desde = CURRENT_DATE
  WHERE vigente_desde IS NULL;

ALTER TABLE plantillas_horario
  ALTER COLUMN vigente_desde SET NOT NULL;

-- Constraint de coherencia temporal
ALTER TABLE plantillas_horario
  ADD CONSTRAINT chk_plantilla_vigencia CHECK (
    vigente_hasta IS NULL OR vigente_hasta > vigente_desde
  );
```

> **Nota sobre `colaboradores.uq_colaboradores_correo`**: la constraint original `UNIQUE (correo)`
> es correcta tal como está: PostgreSQL no aplica UNIQUE a filas con NULL, por lo que múltiples
> colaboradores sin correo conviven sin conflicto. Solo dos colaboradores con el mismo correo
> no-NULL generan error, que es el comportamiento deseado.

---

## Árbol de dependencias entre specs

```
spec 005 (BD base)
  └── 001_schema_completo.sql            ✅ Aplicada
        │
        └── 002_correcciones_esquema.sql ⏳ (fixes de integridad)
              │
              ├── 003_caja_y_pagos.sql   ⏳  spec 012
              │
              ├── 004_bonos_diarios.sql  ⏳  spec 010
              │     └─ crea fn_validar_fecha_en_periodo
              │
              ├── 005_notas_registro.sql ⏳  spec 011
              │     └─ reutiliza fn_validar_fecha_en_periodo
              │
              ├── 006_fix_periodos.sql   ⏳  spec 007
              │     └── 008_registros_observados.sql  ⏳  spec 007
              │
              ├── 007_justificaciones_catalogo.sql  ⏳  spec 014
              │
              └── 010_depuracion_specs.sql           ⏳  (puede ir después de 001)
                    specs: 013, 015, 006, 010, 014
```

**Paralelo seguro** (después de 002): migraciones 003, 004, 005, 007, 010 son independientes entre sí.
**Secuencial requerido**: 006 → 008.

---

## Specs sin migración propia

| Spec | Estado | Nota |
|------|--------|------|
| 017 Paquetes compartidos | ✅ Sin migración | Solo workspace TypeScript |
| 015 Gestión usuarios | ✅ Sin migración | Tablas existen; `contrasena_temporal` agregado en 010 |
| 013 Configuración sistema | ✅ Sin migración | `plantillas_horario.vigente_*` y `horas_minimas_transporte` en 010 |
| 016 Reportes y exportación | ✅ Sin migración | Lee datos existentes, no crea tablas |
| 008 Dashboard asistencia | ✅ Sin migración | Lee `eventos_biometricos`, `colaboradores`, `departamentos` |
| 006 Gestión colaboradores | ✅ Sin migración | Unique parcial por activo corregido en 010 |

---

## Procedimiento de aplicación

### Local (Supabase CLI)
```bash
supabase db push
```

### Producción (Supabase dashboard — SQL Editor)
Ejecutar cada archivo en orden numérico. Verificar sin errores antes de continuar.

Para sentencias `ALTER TYPE ... ADD VALUE`: si falla por dependencias activas,
ejecutarlas en una consulta separada fuera de bloque de transacción.

### Verificación post-migración completa

```sql
-- ENUMs con todos sus valores
SELECT enum_range(NULL::rol_usuario);
-- Esperado: {administrador,supervisor,colaborador,caja}

SELECT enum_range(NULL::estado_resultado);
-- Esperado: {borrador,en_revision,aprobado}

-- Tablas del sistema completo
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Esperadas (27 tablas): adjuntos_nota, aprobaciones_ajuste_biometrico,
-- aprobaciones_justificacion, asignaciones_horario, asignaciones_regla_nomina,
-- auditoria_webhooks, bonos_diarios, colaboradores, confirmaciones_pago,
-- departamentos, dispositivos_biometricos, eventos_biometricos,
-- intentos_login, justificaciones, lineas_resultado_nomina, notas_asistencia,
-- periodos_semanales, plantillas_horario, reglas_nomina,
-- registros_observados, resultados_nomina, sesiones_usuario,
-- ajustes_biometricos, ajustes_caja, tokens_api_externa,
-- tokens_recuperacion, tipos_justificacion_catalogo, tipos_verificacion, usuarios
-- (29 - 2 sin registros_aprobacion = 27 ← confir. con COUNT(*))

-- Verificar columnas nuevas en migración 010
SELECT column_name FROM information_schema.columns
WHERE table_name = 'usuarios' AND column_name = 'contrasena_temporal';
-- Esperado: 1 fila

SELECT column_name FROM information_schema.columns
WHERE table_name = 'reglas_nomina' AND column_name = 'horas_minimas_transporte';
-- Esperado: 1 fila

SELECT column_name FROM information_schema.columns
WHERE table_name = 'plantillas_horario' AND column_name = 'vigente_desde';
-- Esperado: 1 fila

-- Constraint de sábado activo
SELECT conname FROM pg_constraint
WHERE conrelid = 'periodos_semanales'::regclass AND conname = 'chk_inicio_sabado';

-- Sin tabla polimórfica
SELECT COUNT(*) FROM pg_tables
WHERE tablename = 'registros_aprobacion' AND schemaname = 'public';
-- Esperado: 0
```
