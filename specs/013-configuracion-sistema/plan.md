# Implementation Plan: Configuración del Sistema

**Branch**: `013-configuracion-sistema` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Módulo de administración para crear y versionar reglas de nómina (`reglas_nomina`) y plantillas
de horario (`plantillas_horario`), y asignarlas a colaboradores individuales o departamentos
enteros. Toda regla y plantilla tiene vigencia fechada (`vigente_desde`, `vigente_hasta`) para
que los cálculos históricos siempre usen la configuración del período correcto.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `@biometrico/types`
- Frontend: Next.js 14, PrimeReact (`DataTable`, `Calendar`, `InputNumber`, `Dropdown`)

**Storage**: PostgreSQL — `reglas_nomina`, `plantillas_horario`, `asignaciones_regla_nomina`, `asignaciones_horario`

**Testing**: Vitest — tests de resolución de asignación vigente (individual override > departamento)

**Target Platform**: Node 20.x + Next.js 14 (solo administrador accede)

**Constraints**:
- Ninguna regla de negocio hardcodeada (Principio III) — todo configurable en DB
- Reglas versionadas: al crear nueva regla, la anterior `vigente_hasta` se cierra automáticamente
- XOR en asignaciones: o por colaborador o por departamento, nunca los dos
- No activar regla/plantilla ya desactivada

**Scale/Scope**: ~5 reglas de nómina; ~5 plantillas de horario; ~200 asignaciones activas

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| II — Cálculo determinístico | Sí | ✅ Reglas versionadas con `vigente_desde`; recalcular semana pasada = mismo resultado |
| III — Reglas configurables | Sí | ✅ Núcleo de este módulo |
| V — RBAC | Sí | ✅ Solo administrador puede crear/editar; supervisor puede consultar |
| VI — Trazabilidad | Sí | ✅ `creado_por` en reglas y asignaciones |
| VIII — Mobile-first | Sí | ✅ Formularios de configuración en columna única |
| IX — Simplicidad UX | Sí | ✅ Wizard de 2 pasos: crear regla → asignar |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
├── reglas-nomina/
│   ├── reglas.router.ts
│   ├── reglas.service.ts        # CRUD + cierre automático de vigencia anterior
│   └── reglas.service.test.ts
├── plantillas-horario/
│   ├── plantillas.router.ts
│   ├── plantillas.service.ts
│   └── plantillas.service.test.ts
└── asignaciones/
    ├── asignaciones.router.ts   # GET/POST asignaciones (horario y nómina)
    ├── asignaciones.service.ts  # resolver asignación vigente + XOR validation
    └── asignaciones.service.test.ts

apps/frontend/src/pages/configuracion/
├── reglas/
│   ├── index.tsx                # Lista de reglas con historial
│   └── nueva.tsx                # Formulario nueva regla
├── horarios/
│   ├── index.tsx
│   └── nueva.tsx
└── asignaciones/
    └── index.tsx                # Asignar regla/horario a colaborador o departamento
```
