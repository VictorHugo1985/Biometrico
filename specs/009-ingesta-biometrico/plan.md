# Implementation Plan: Ingesta de Registros Biométricos

**Branch**: `009-ingesta-biometrico` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Dos canales de ingesta de eventos biométricos: (1) endpoint webhook `POST /api/webhooks/crosschex`
que recibe marcaciones en tiempo real desde CrossChex Cloud con validación de firma HMAC, y
(2) importación manual de CSV de CrossChex con deduplicación por `id_solicitud_externo`.
Incluye vista de solo lectura de todos los registros biométricos con filtros y detalle de payload.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `multer` (upload CSV), `csv-parse`
- Frontend: Next.js 14, PrimeReact (`DataTable`, `FileUpload`, `Dialog`)
- Shared: `@biometrico/types`, `@biometrico/utils` (toCoT)

**Storage**: PostgreSQL via Supabase — tablas: `eventos_biometricos`, `auditoria_webhooks`, `colaboradores`, `dispositivos_biometricos`

**Testing**: Vitest; mocks de Supabase para tests unitarios del parser y validador de firma

**Target Platform**: Node 20.x server; Next.js frontend (SSR + CSR)

**Performance Goals**: Respuesta al webhook < 5 segundos (especificado en spec); importación de 5.000 filas CSV < 30 segundos

**Constraints**:
- `eventos_biometricos` es APPEND-ONLY (Principio I) — ningún UPDATE/DELETE permitido
- Deduplicación MUST-HAVE: mismo `id_solicitud_externo` → estado 'duplicado', sin inserción
- Firma HMAC del webhook validada antes de cualquier procesamiento
- CSV limitado a 5.000 filas por importación

**Scale/Scope**: ~200 colaboradores; picos de hasta 200 marcaciones simultáneas al inicio de turno

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | Sí | ✅ APPEND-ONLY; trigger `trg_bloquear_mutacion_eventos` en DB |
| II — Cálculo determinístico | No | ✅ N/A |
| III — Reglas configurables | No | ✅ N/A |
| IV — Ciclo semanal | No | ✅ N/A |
| V — RBAC | Sí | ✅ Webhook público (autenticado por HMAC); vista requiere rol administrador o supervisor |
| VI — Trazabilidad | Sí | ✅ `auditoria_webhooks` registra cada request con payload y firma |
| VII — Tiempo real | Sí | ✅ Webhook procesa en tiempo real; vista refleja eventos en < 60 s |
| VIII — Mobile-first | Sí | ✅ Vista de registros: tabla colapsa a tarjetas en móvil |
| IX — Simplicidad UX | Sí | ✅ Import CSV: previsualización antes de confirmar; errores por fila claros |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Documentation

```text
specs/009-ingesta-biometrico/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── api-webhook.md
│   └── api-registros.md
├── quickstart.md
└── tasks.md
```

### Source Code

```text
apps/backend/src/
├── webhooks/
│   ├── webhooks.router.ts       # POST /api/webhooks/crosschex
│   ├── webhooks.service.ts      # validación firma, parseo, persistencia
│   ├── webhooks.types.ts        # CrossChexPayload, WebhookResult
│   └── webhooks.service.test.ts
├── registros/
│   ├── registros.router.ts      # GET /api/registros
│   ├── registros.service.ts     # lista, filtros, detalle
│   └── registros.service.test.ts
└── csv-import/
    ├── csv-import.router.ts     # POST /api/registros/import
    ├── csv-import.service.ts    # parseo, validación, deduplicación
    ├── csv-import.parser.ts     # lógica pura de parseo CSV
    └── csv-import.service.test.ts

apps/frontend/src/
├── pages/registros/
│   ├── index.tsx                # lista de registros con filtros
│   └── [id].tsx                 # detalle de registro (payload, notas)
└── components/registros/
    ├── RegistrosTable.tsx
    ├── ImportCSVDialog.tsx
    └── RegistroDetail.tsx
```

**Structure Decision**: Backend separado en `webhooks/`, `registros/` y `csv-import/` por
responsabilidades distintas. El webhook es un receptor externo; los registros son la vista de
auditoría; el import CSV es un proceso batch manual.
