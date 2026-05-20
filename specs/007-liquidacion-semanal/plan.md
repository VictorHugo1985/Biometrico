# Implementation Plan: Liquidación Semanal de Horas Trabajadas

**Branch**: `007-liquidacion-semanal` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Motor de liquidación semanal (sábado–viernes): calcula horas trabajadas por colaborador desde
eventos biométricos, identifica registros observados (atrasos, ausencias, salidas anticipadas),
permite al supervisor resolver cada observación con 3 opciones de tratamiento (pago completo,
penalidad por hora, penalidad de tarifa general), integra bonos confirmados (`bonos_diarios`),
y habilita al administrador aprobar el período. Una vez aprobado, el resultado es inmutable.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `@biometrico/types`, `@biometrico/utils` (toCoT, parsePeriodo)
- Frontend: Next.js 14, PrimeReact (`DataTable`, `Timeline`, `Dialog`, `InputNumber`, `Tag`)

**Storage**: PostgreSQL — `periodos_semanales`, `resultados_nomina`, `registros_observados`, `lineas_resultado_nomina`, `bonos_diarios`, `eventos_biometricos`

**Testing**: Vitest — tests de cálculo de horas (normal, extra, atraso, ausencia), tests de penalidades, tests de integridad del total

**Performance Goals**: Generar liquidación de 200 colaboradores < 30 segundos

**Constraints**:
- Período siempre sábado–viernes (constraint `chk_inicio_sabado` en DB)
- Aprobado = INMUTABLE (Principio I aplicado a resultados de nómina)
- Bloquear aprobación si hay `registros_observados` sin decisión
- `total_bono_*` calculado on-the-fly desde `bonos_diarios` (no cacheado desde migration 004)
- `aprobado_por` + `aprobado_en` se registran al aprobar (spec FR-014)

**Scale/Scope**: ~200 colaboradores; semanas de 6 días; hasta 12 eventos biométricos por colaborador por día

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | Sí | ✅ Eventos de entrada son read-only; correcciones via `ajustes_biometricos` |
| II — Cálculo determinístico | Sí | ✅ Recalcular con mismos datos produce mismo resultado; reglas versionadas |
| III — Reglas configurables | Sí | ✅ Tarifa viene de `reglas_nomina` vigente al período |
| IV — Ciclo semanal | Sí | ✅ Núcleo de este módulo |
| V — RBAC | Sí | ✅ Supervisor: genera y revisa; Admin: aprueba; Caja: recibe aprobado |
| VI — Trazabilidad | Sí | ✅ `aprobado_por`, `resuelto_por` en observaciones, justificaciones |
| VIII — Mobile-first | Sí | ✅ Resumen por colaborador en tarjetas; detalle en panel deslizante |
| IX — Simplicidad UX | Sí | ✅ Bloqueo claro de aprobación con lista de pendientes; 3 opciones no más |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── liquidacion/
    ├── liquidacion.router.ts         # POST /generar, GET /:id, PATCH /observados/:id, POST /aprobar
    ├── liquidacion.service.ts        # orquestador del flujo
    ├── horas.calculator.ts           # cálculo puro de horas desde eventos (testeable aislado)
    ├── observados.service.ts         # identificar y resolver registros observados
    ├── penalidades.service.ts        # aplicar penalidades y recalcular
    ├── bonos.aggregator.ts           # SUM bonos confirmados desde bonos_diarios
    └── liquidacion.service.test.ts   # tests de cálculo exhaustivos

apps/frontend/src/
├── pages/liquidacion/
│   ├── index.tsx                     # lista de períodos
│   ├── nueva.tsx                     # seleccionar semana y generar
│   └── [id].tsx                      # detalle: resumen + observados + bonos
└── components/liquidacion/
    ├── ResumenPeriodo.tsx
    ├── ObservadosTable.tsx
    ├── DecisionDialog.tsx            # modal para decidir tratamiento de observación
    └── AprobacionDialog.tsx
```
