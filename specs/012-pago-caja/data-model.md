# Data Model: Gestión de Pago por Caja

**Feature**: 012-pago-caja | **Date**: 2026-05-20

## Relación con el schema existente

El flujo de Caja opera sobre tablas existentes y agrega dos tablas nuevas:

```
usuarios (existente)
  └── rol: rol_usuario ← agregar valor 'caja'

resultados_nomina (existente — dominio del supervisor)
  ├── id, periodo_id, colaborador_id, total_bruto, estado ('borrador'|'aprobado')
  ├── ajustes_caja (NUEVA) ── 0..n por resultado_nomina
  └── confirmaciones_pago (NUEVA) ── 0..1 por resultado_nomina
```

---

## Migración de schema: `002_pago_caja.sql`

```sql
-- ============================================================
-- STEP 1: Agregar rol 'caja' al enum existente
-- NOTA: ADD VALUE no puede ejecutarse dentro de una transacción
--       en PostgreSQL; esta migración debe ser la única instrucción
--       o ejecutarse con autocommit.
-- ============================================================
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'caja';

-- ============================================================
-- STEP 2: Enum para tipo de ajuste de Caja
-- ============================================================
DO $$ BEGIN
  CREATE TYPE tipo_ajuste_caja AS ENUM ('descuento', 'incremento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- STEP 3: Tabla de ajustes realizados por el cajero
-- ============================================================
CREATE TABLE IF NOT EXISTS ajustes_caja (
  id                   UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_nomina_id  UUID              NOT NULL REFERENCES resultados_nomina(id),
  tipo                 tipo_ajuste_caja  NOT NULL,
  monto                NUMERIC(10,2)     NOT NULL CHECK (monto > 0),
  motivo               TEXT              NOT NULL,
  cajero_id            UUID              NOT NULL REFERENCES usuarios(id),
  creado_en            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  -- soft-delete para trazabilidad (Principio VI)
  anulado              BOOLEAN           NOT NULL DEFAULT false,
  anulado_en           TIMESTAMPTZ,
  anulado_por          UUID              REFERENCES usuarios(id),
  motivo_anulacion     TEXT,
  CONSTRAINT chk_anulacion_consistente
    CHECK (
      (anulado = false AND anulado_en IS NULL AND anulado_por IS NULL AND motivo_anulacion IS NULL) OR
      (anulado = true  AND anulado_en IS NOT NULL AND anulado_por IS NOT NULL AND motivo_anulacion IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_ajustes_caja_resultado
  ON ajustes_caja(resultado_nomina_id) WHERE anulado = false;

-- ============================================================
-- STEP 4: Tabla de confirmaciones de pago (1 por resultado_nomina)
-- ============================================================
CREATE TABLE IF NOT EXISTS confirmaciones_pago (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_nomina_id  UUID          NOT NULL UNIQUE REFERENCES resultados_nomina(id),
  fecha_pago           DATE          NOT NULL,
  monto_pagado         NUMERIC(10,2) NOT NULL CHECK (monto_pagado >= 0),
  metodo_pago          TEXT          NOT NULL DEFAULT 'efectivo',
  motivo_diferencia    TEXT,         -- obligatorio si monto_pagado ≠ total_final_caja
  cajero_id            UUID          NOT NULL REFERENCES usuarios(id),
  creado_en            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_diferencia_documentada
    CHECK (motivo_diferencia IS NOT NULL OR motivo_diferencia IS NULL)
    -- validación de negocio: si monto_pagado ≠ total calculado → motivo_diferencia NOT NULL
    -- se aplica en la capa de servicio (no expresable como CHECK sin subquery)
);

CREATE INDEX IF NOT EXISTS idx_confirmaciones_cajero
  ON confirmaciones_pago(cajero_id, fecha_pago DESC);
```

---

## Entidades del dominio

### ConsolidadoPago (vista de Caja)

Proyección de lectura que combina datos existentes con los nuevos:

| Campo | Fuente | Descripción |
|-------|--------|-------------|
| `resultado_nomina_id` | `resultados_nomina.id` | Identificador del consolidado |
| `colaborador_nombre` | `colaboradores.nombre + apellido` | Nombre completo |
| `colaborador_area` | `departamentos.nombre` | Área del colaborador |
| `periodo_inicio` | `periodos_semanales.inicio_periodo` | Inicio del período |
| `periodo_fin` | `periodos_semanales.fin_periodo` | Fin del período |
| `total_bruto` | `resultados_nomina.total_bruto` | Total calculado por supervisor |
| `total_ajustes_caja` | Σ `ajustes_caja` activos | Neto de incrementos − descuentos |
| `total_final_caja` | Calculado | `total_bruto + total_ajustes_caja` |
| `estado_pago` | Derivado | `'pagado'` si existe `confirmaciones_pago`, `'pendiente'` si no |
| `fecha_aprobacion` | `registros_aprobacion` | Cuándo el supervisor aprobó |

### AjusteCaja

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `resultado_nomina_id` | UUID | FK → `resultados_nomina` |
| `tipo` | `tipo_ajuste_caja` | 'descuento' \| 'incremento' |
| `monto` | NUMERIC(10,2) | > 0 |
| `motivo` | TEXT | NOT NULL |
| `cajero_id` | UUID | FK → `usuarios` |
| `creado_en` | TIMESTAMPTZ | auto |
| `anulado` | BOOLEAN | default false |
| `anulado_en` | TIMESTAMPTZ | NOT NULL si anulado |
| `anulado_por` | UUID | FK → `usuarios`, NOT NULL si anulado |
| `motivo_anulacion` | TEXT | NOT NULL si anulado |

**Invariantes**:
- `total_final_caja` nunca puede ser < 0 (validado en servicio antes de INSERT)
- No se pueden agregar/anular ajustes si existe `confirmaciones_pago` para ese `resultado_nomina_id`

### ConfirmacionPago

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `resultado_nomina_id` | UUID | FK → `resultados_nomina`, UNIQUE |
| `fecha_pago` | DATE | NOT NULL |
| `monto_pagado` | NUMERIC(10,2) | ≥ 0 |
| `metodo_pago` | TEXT | NOT NULL, default 'efectivo' |
| `motivo_diferencia` | TEXT | NOT NULL si `monto_pagado ≠ total_final_caja` |
| `cajero_id` | UUID | FK → `usuarios` |
| `creado_en` | TIMESTAMPTZ | auto |

**Invariantes**:
- Solo puede existir 1 registro por `resultado_nomina_id` (UNIQUE constraint)
- El `resultado_nomina.estado` debe ser 'aprobado' para poder insertar (validado en servicio)
- Una vez insertado, es inmutable (ningún UPDATE ni DELETE permitido desde la aplicación)

---

## Transiciones de estado del flujo completo

```
resultados_nomina.estado:
  'borrador'
      ↓ (supervisor aprueba — spec 007)
  'aprobado'  ←── visible en cola de Caja
      │
      │  cajero agrega ajustes_caja (0 o más)
      │  cajero confirma pago
      ↓
  'aprobado' + confirmaciones_pago EXISTS ←── estado efectivo: PAGADO
              (resultados_nomina no cambia)
```

El estado "pagado" es derivado, no un valor de columna en `resultados_nomina`. Esto preserva la inmutabilidad del dominio del supervisor.
