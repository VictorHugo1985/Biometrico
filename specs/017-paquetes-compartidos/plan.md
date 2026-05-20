# Implementation Plan: Paquetes Compartidos del Monorepo

**Branch**: `017-paquetes-compartidos` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Crear los paquetes internos `@biometrico/types` y `@biometrico/utils` en el monorepo Turborepo.
`@biometrico/types` exporta únicamente interfaces TypeScript y enums sin dependencias de runtime.
`@biometrico/utils` exporta funciones puras (zona horaria COT, formateo de moneda, validación de
archivos, validadores de dominio) con dependencia mínima en `date-fns`. Ambos paquetes se
consumen vía workspace protocol por `apps/backend` y `apps/frontend`. Son **Fase 0**: prerequisito
de todos los demás módulos.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- `@biometrico/types`: ninguna (solo TypeScript devDependencies)
- `@biometrico/utils`: `date-fns` + `date-fns-tz`

**Storage**: N/A

**Testing**: Vitest + `@vitest/coverage-v8`

**Target Platform**: Node 20.x (backend) + navegador moderno (frontend); funciones puras sin APIs de plataforma

**Project Type**: Librería interna de monorepo (workspace-only, no publicada a npm)

**Constraints**:
- `@biometrico/types`: CERO dependencias de runtime
- Todas las funciones en `@biometrico/utils` deben ser puras (sin efectos secundarios)
- Build < 5 segundos

**Scale/Scope**: ~15 interfaces, ~7 enums, ~8 funciones; < 500 líneas de código total

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | No | ✅ N/A |
| II — Cálculo determinístico | Sí | ✅ `toCoT` y `formatBs` son funciones puras |
| III — Reglas configurables | Parcial | ✅ `validateFile` recibe config como parámetro |
| IV — Ciclo semanal | Sí | ✅ `parsePeriodo` soporta sábado–viernes |
| V — RBAC | No | ✅ N/A |
| VI — Trazabilidad | No | ✅ N/A |
| VII — Tiempo real | No | ✅ N/A |
| VIII — Mobile-first | No | ✅ N/A — código compartido, sin UI |
| IX — Simplicidad UX | Sí | ✅ API mínima con nombres en vocabulario del dominio |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Documentation

```text
specs/017-paquetes-compartidos/
├── plan.md
├── research.md
├── data-model.md
├── contracts/api-packages.md
├── quickstart.md
└── tasks.md  ← /speckit-tasks
```

### Source Code

```text
packages/
├── types/
│   ├── package.json          # "@biometrico/types", sin dependencies
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── entities.ts       # Colaborador, Departamento, Usuario, Sesion
│       ├── nomina.ts         # PeriodoSemanal, ResultadoNomina, LineaResultadoNomina
│       ├── bonos.ts          # BonoDiario, ConfiguracionBono
│       ├── pagos.ts          # AjusteCaja, ConfirmacionPago
│       ├── asistencia.ts     # NotaAsistencia, AdjuntoNota, Justificacion
│       ├── api.ts            # ApiResponse<T>, PaginatedResponse<T>, ApiError
│       └── enums.ts          # RolUsuario, EstadoResultado, EstadoPeriodo, ...
│
└── utils/
    ├── package.json          # "@biometrico/utils", dep: date-fns, date-fns-tz
    ├── tsconfig.json
    ├── vitest.config.ts
    └── src/
        ├── index.ts
        ├── dates.ts          # toCoT(), parsePeriodo()
        ├── currency.ts       # formatBs()
        ├── storage.ts        # validateFile(), StorageConfig, StorageError
        ├── validators.ts     # isValidCodigoEmpleado(), isPositiveBs(), isValidPeriodo()
        └── __tests__/
            ├── dates.test.ts
            ├── currency.test.ts
            ├── storage.test.ts
            └── validators.test.ts
```

**Structure Decision**: Dos paquetes separados obligatorio — `@biometrico/types` tiene cero runtime deps (FR-004); fusionarlos con utils violaría esa restricción.
