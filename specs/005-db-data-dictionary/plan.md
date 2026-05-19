# Implementation Plan: Diccionario de Datos Relacional

**Branch**: `005-db-data-dictionary` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-db-data-dictionary/spec.md`

## Summary

Implementar el esquema completo de la base de datos relacional del sistema Biometrico: 21 tablas en 7 dominios como contrato único que precede a toda implementación de backend, frontend y migraciones. El enfoque es database-first; este plan produce los scripts SQL de migración (Supabase/PostgreSQL), los tipos TypeScript compartidos, y las restricciones de integridad a nivel DB que hacen cumplir los principios de la Constitución.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS) — Nest.js backend, Next.js frontend

**Primary Dependencies**: Turborepo (monorepo), Supabase CLI (migraciones SQL), PostgreSQL 15 (via Supabase)

**Storage**: PostgreSQL 17.6 (Supabase) — tipos nativos: `UUID`, `TEXT`, `NUMERIC`, `TIMESTAMPTZ`, `JSONB`, `INTEGER[]`, `CREATE TYPE ... AS ENUM`

**Testing**: Tests de integración contra DB local (Supabase local vía Docker); scripts SQL de verificación de constraints

**Target Platform**: Supabase (PostgreSQL 15 managed), Linux server; aplicación web responsive

**Project Type**: Web application — monorepo Turborepo con `apps/backend` (Nest.js), `apps/frontend` (Next.js), `packages/database` (tipos compartidos)

**Performance Goals**: Latencia de escritura de evento biométrico < 100ms (Principio VII: vista de asistencia < 60s desde evento); queries de nómina semanal < 2s

**Constraints**: Migraciones reversibles (up/down); `eventos_biometricos` append-only enforced a nivel DB; campos de dinero con `NUMERIC(10,2)` sin excepción; single-tenant (sin `empresa_id`)

**Scale/Scope**: ~50–500 colaboradores; ~2 eventos biométricos/día/colaborador; cierre semanal = 1 run de cálculo de nómina/semana por colaborador

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Descripción | Estado | Evidencia en el modelo |
|-----------|-------------|--------|----------------------|
| **I** Inmutabilidad biométrica | `eventos_biometricos` append-only | ✅ PASS | Trigger `BEFORE UPDATE OR DELETE`; correcciones en `ajustes_biometricos` |
| **II** Cálculo determinístico | Traza evento → resultado → regla | ✅ PASS | `lineas_resultado_nomina.evento_biometrico_id`, `resultados_nomina.regla_nomina_id` |
| **III** Reglas configurables | Tarifas y horarios versionados | ✅ PASS | `reglas_nomina` + `plantillas_horario` con `vigente_desde/hasta`; no hay valores hardcodeados |
| **IV** Ciclo semanal | `periodos_semanales` como unidad primaria | ✅ PASS | `inicio_periodo` (lunes) CHECK; estados `abierto/cerrado/reabierto` |
| **V** RBAC | 3 roles fijos en `usuarios.rol` | ✅ PASS | `enum(administrador,supervisor,colaborador)`; `creado_por` en operaciones sensibles |
| **VI** Trazabilidad | Auditoría en ajustes y justificaciones | ✅ PASS | `ajustes_biometricos.motivo` NN; `registros_aprobacion.decidido_por/en/notas` |
| **VII** Tiempo real | Latencia medible en `auditoria_webhooks` | ✅ PASS | `recibido_en` en `eventos_biometricos` y `auditoria_webhooks` para medir latencia |

**Seguridad (Constitución §Restricciones)**: Tokens y hashes nunca en texto plano — cubierto por FR-006 (`hash_token` en `sesiones_usuario`/`tokens_recuperacion`; `valor_token` en `tokens_api_externa` con cifrado en reposo).

**Violaciones**: ninguna. No se requiere justificación de complejidad adicional.

## Project Structure

### Documentation (this feature)

```text
specs/005-db-data-dictionary/
├── plan.md                       # Este archivo (/speckit-plan)
├── research.md                   # Phase 0: mapeo de tipos, decisiones técnicas
├── data-model.md                 # Phase 1: grafo FK, relaciones, lifecycle
├── quickstart.md                 # Phase 1: guía de implementación
├── contracts/
│   └── migration-order.md        # Phase 1: orden de creación de tablas (21 waves)
└── tasks.md                      # Phase 2 (/speckit-tasks — aún no creado)
```

### Source Code (repository root)

```text
supabase/
├── config.toml
└── migrations/
    ├── [ts]_001_tipos_verificacion.sql
    ├── [ts]_002_usuarios.sql
    ├── [ts]_003_departamentos.sql
    ├── [ts]_004_tokens_api_externa.sql
    ├── [ts]_005_dispositivos_biometricos.sql
    ├── [ts]_006_colaboradores.sql
    ├── [ts]_007_sesiones_usuario.sql
    ├── [ts]_008_tokens_recuperacion.sql
    ├── [ts]_009_intentos_login.sql
    ├── [ts]_010_plantillas_horario.sql
    ├── [ts]_011_reglas_nomina.sql
    ├── [ts]_012_periodos_semanales.sql
    ├── [ts]_013_registros_aprobacion.sql
    ├── [ts]_014_asignaciones_horario.sql
    ├── [ts]_015_asignaciones_regla_nomina.sql
    ├── [ts]_016_eventos_biometricos.sql     ← trigger append-only incluido
    ├── [ts]_017_resultados_nomina.sql
    ├── [ts]_018_ajustes_biometricos.sql
    ├── [ts]_019_auditoria_webhooks.sql
    ├── [ts]_020_justificaciones.sql
    ├── [ts]_021_lineas_resultado_nomina.sql
    ├── [ts]_022_triggers_actualizado_en.sql
    └── [ts]_023_indices_adicionales.sql

packages/
└── database/
    ├── package.json
    └── src/
        ├── database.types.ts     ← generado por `supabase gen types typescript`
        └── index.ts

apps/
├── backend/                      ← Nest.js (consume packages/database)
└── frontend/                     ← Next.js (consume packages/database)
```

**Structure Decision**: Turborepo con `supabase/` en la raíz del monorepo (estándar Supabase); `packages/database` centraliza los tipos TypeScript compartidos; cada app importa desde `@biometrico/database`.

## Complexity Tracking

> No hay violaciones a la Constitución. Sección vacía.

---

## Phase 0: Research

**Status**: ✅ Completado — ver [research.md](./research.md)

Resoluciones principales:
- Tipos vendor-neutral mapeados a PostgreSQL 15 (ver tabla completa en research.md)
- UUID via `gen_random_uuid()` — sin extensión adicional
- Append-only: trigger `BEFORE UPDATE OR DELETE` en `eventos_biometricos`
- Migraciones: Supabase CLI en `supabase/migrations/`
- Enums: `CREATE TYPE ... AS ENUM` (detectados por ORM/code generators)
- `actualizado_en`: trigger genérico reutilizable `fn_actualizar_timestamp()`
- XOR constraint: `CHECK` a nivel de tabla en `asignaciones_*`
- TypeScript types: `packages/database` con `supabase gen types typescript`

---

## Phase 1: Design & Contracts

**Status**: ✅ Completado

| Artefacto | Archivo | Estado |
|-----------|---------|--------|
| Grafo de dependencias FK | [data-model.md](./data-model.md) | ✅ |
| Relaciones por dominio | [data-model.md](./data-model.md) | ✅ |
| Lifecycle de entidades | [data-model.md](./data-model.md) | ✅ |
| Orden de migración (21 waves) | [contracts/migration-order.md](./contracts/migration-order.md) | ✅ |
| Guía de implementación | [quickstart.md](./quickstart.md) | ✅ |

### Re-check Constitution Post-Design

Todos los principios I–VII confirmados con los artefactos de diseño generados. Sin violaciones ni complejidad adicional a justificar.

---

## Próximo Paso

Ejecutar `/speckit-tasks` para generar `tasks.md` con las tareas de implementación de los 23 scripts SQL de migración, el trigger, los índices, y el paquete `packages/database`.
