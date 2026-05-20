# Implementation Plan: Bonos Diarios de Transporte y Alimentación

**Branch**: `010-bonos-diarios` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Gestión de bonos diarios: el sistema sugiere automáticamente el bono de transporte para días
donde el colaborador trabajó las horas mínimas configuradas; el supervisor confirma o rechaza.
El bono de alimentación es manual: el supervisor lo agrega explícitamente para un día específico.
Ambos bonos se integran en el total de la liquidación semanal a través de `bonos_diarios`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `@biometrico/types`, `@biometrico/utils` (toCoT)
- Frontend: Next.js 14, PrimeReact (`DataTable`, `Tag`, `Button`, `ConfirmDialog`)

**Storage**: PostgreSQL — `bonos_diarios`, `eventos_biometricos`, `reglas_nomina`, `resultados_nomina`

**Testing**: Vitest — tests de eligibilidad de transporte (casos: horas suficientes, insuficientes, día sin eventos), tests de estado de bono alimentación

**Constraints**:
- Transporte: calculado por sistema al generar liquidación; supervisor solo confirma/rechaza
- Alimentación: NUNCA auto-sugerido; solo supervisor agrega manualmente
- Cambios de bono después de período aprobado: bloqueados
- Montos vienen de `reglas_nomina.bono_transporte_diario` / `bono_alimentacion_diario`

**Scale/Scope**: ~200 colaboradores × 6 días = ~1.200 registros `bonos_diarios` por semana

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| II — Cálculo determinístico | Sí | ✅ Elegibilidad de transporte = función pura de horas trabajadas vs umbral |
| III — Reglas configurables | Sí | ✅ Montos y umbral de horas desde `reglas_nomina` |
| V — RBAC | Sí | ✅ Supervisor: confirma/rechaza/agrega; Admin: idem + config montos |
| VI — Trazabilidad | Sí | ✅ `gestionado_por` + `gestionado_en` en `bonos_diarios` |
| VIII — Mobile-first | Sí | ✅ Vista diaria de bonos por colaborador en lista vertical |
| IX — Simplicidad UX | Sí | ✅ Acción directa confirm/reject sin modales innecesarios para transporte |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── bonos/
    ├── bonos.router.ts               # GET /bonos/:periodo_id, PATCH /bonos/:id
    ├── bonos.service.ts              # calcular elegibilidad, confirmar, rechazar, agregar alimentación
    ├── eligibilidad.calculator.ts    # lógica pura: horas_trabajadas >= umbral → elegible
    └── bonos.service.test.ts

apps/frontend/src/
├── pages/liquidacion/[id]/bonos.tsx  # vista diaria de bonos por colaborador (dentro del flujo de liquidación)
└── components/bonos/
    ├── BonoDiarioRow.tsx
    ├── BonoTransporteActions.tsx     # botones confirmar/rechazar
    └── AgregarBonoAlimentacionDialog.tsx
```
