# Implementation Plan: Integración CrossChex Cloud

**Branch**: `001-naviz-webhook` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Dos canales de integración con CrossChex Cloud: (1) corrección del webhook ya implementado en
spec 009 (comportamiento HTTP siempre-200 y firma por comparación directa en lugar de HMAC), y
(2) nuevo cliente REST API de CrossChex con autenticación JWT, renovación automática y
sincronización histórica paginada. Los registros se insertan en `eventos_biometricos`
(append-only, Principio I) con `origen = 'sincronizacion_api'`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: NestJS 10, `pg`, `node:fetch` (Node 20 built-in — sin dependencia adicional)
- Shared: `@biometrico/types` (sin cambios necesarios)

**Storage**: PostgreSQL via pg — tablas: `eventos_biometricos`, `auditoria_webhooks`,
`colaboradores`, `dispositivos_biometricos`

**Testing**: Vitest; mocks de `fetch` para el cliente REST API

**Target Platform**: Node 20.x / NestJS server

**Performance Goals**: Webhook < 5 segundos (SC-001); sincronización de 1 semana (~1400 eventos)
< 60 segundos incluyendo 2 páginas de API

**Constraints**:
- `eventos_biometricos` APPEND-ONLY — nunca UPDATE ni DELETE (Principio I)
- Webhook responde SIEMPRE HTTP 200 — incluso si firma inválida o error interno
- Token JWT en memoria (no en DB); renovar si `expiresAt - 5min < now`
- `CROSSCHEX_WEBHOOK_SECRET` nunca en código fuente — siempre variable de entorno

**Scale/Scope**: ~200 colaboradores; ~1400 eventos/semana; máx. 2 páginas API por semana

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | Sí | ✅ Solo INSERT en `eventos_biometricos`; trigger DB bloquea UPDATE/DELETE |
| II — Cálculo determinístico | No | ✅ N/A |
| III — Reglas configurables | No | ✅ N/A |
| IV — Ciclo semanal | No | ✅ N/A |
| V — RBAC | Sí | ✅ Webhook: autenticado por `authorize-sign`; sync REST: rol `administrador` |
| VI — Trazabilidad | Sí | ✅ `auditoria_webhooks` registra todos los intentos; sync log en `Logger` |
| VII — Tiempo real | Sí | ✅ Webhook procesa < 5 s; vista refleja evento inmediatamente |
| VIII — Mobile-first | No | ✅ N/A (backend only) |
| IX — Simplicidad UX | Sí | ✅ Sync endpoint con un body mínimo (begin_time, end_time, workno?) |

**Gate**: ✅ Sin violaciones.

## Correcciones sobre spec 009

### Bug: webhook devuelve HTTP 401 para firma inválida

**Archivo**: `apps/backend/src/webhooks/webhooks.controller.ts`

**Problema**: El controller lanza `UnauthorizedException` cuando `firmaValida = false`,
provocando HTTP 401. CrossChex reintenta en 401 → bucle de reintentos.

**Corrección**: No lanzar excepción; siempre devolver `{ code: '200', msg: 'success' }`.

### Bug: validación de firma usa HMAC en lugar de comparación directa

**Archivo**: `apps/backend/src/webhooks/webhooks.service.ts`

**Problema**: `verifySignature` computa HMAC-SHA256 sobre el raw body. CrossChex envía el
secreto literal como `authorize-sign`, no un HMAC. Los webhooks reales serán rechazados.

**Corrección**: comparar `authorize-sign` directamente contra `CROSSCHEX_WEBHOOK_SECRET` usando
`timingSafeEqual` sobre buffers UTF-8.

## Project Structure

### Documentation

```text
specs/001-naviz-webhook/
├── plan.md         ← este archivo
├── research.md
├── data-model.md
├── contracts/
│   └── api-crosschex.md
├── quickstart.md
└── tasks.md        ← generado por /speckit-tasks
```

### Source Code

```text
apps/backend/src/
├── webhooks/
│   ├── webhooks.controller.ts   ← CORREGIR: siempre HTTP 200
│   ├── webhooks.service.ts      ← CORREGIR: firma por comparación directa
│   ├── webhooks.types.ts        ← ya existe (spec 009)
│   └── webhooks.service.test.ts ← ACTUALIZAR: tests de firma
└── crosschex/
    ├── crosschex.service.ts     ← NUEVO: cliente REST API (auth + sync)
    ├── crosschex.controller.ts  ← NUEVO: POST /api/crosschex/sync, GET /api/crosschex/status
    ├── crosschex.module.ts      ← NUEVO
    └── crosschex.service.test.ts ← NUEVO: tests con fetch mock
```

**Structure Decision**: El módulo `crosschex/` es nuevo y separado de `webhooks/` porque
tienen responsabilidades distintas: `webhooks/` es un receptor pasivo (push); `crosschex/`
es un cliente activo (pull). Ambos comparten `DB_POOL` vía `AuthModule`.
