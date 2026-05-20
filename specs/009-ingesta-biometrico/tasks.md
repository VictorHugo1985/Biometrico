# Tasks: Ingesta de Registros Biométricos

**Spec**: 009-ingesta-biometrico | **Branch**: `009-ingesta-biometrico`

## Phase 0 — Setup

- [X] T-001: Instalar csv-parse y @types/multer
- [X] T-002: Habilitar rawBody en main.ts (requerido para HMAC-SHA256)
- [X] T-003: Crear webhooks/webhooks.types.ts (CrossChexPayload, EventoResult, CSVImportResult)

## Phase 1 — Webhook upgrade

- [X] T-004: Reescribir webhooks/webhooks.service.ts — HMAC-SHA256, @Inject(DB_POOL), inserción eventos_biometricos + auditoria
- [X] T-005: Actualizar webhooks/webhooks.controller.ts — raw body, tipado CrossChexPayload
- [X] T-006: Actualizar webhooks/webhooks.module.ts — importar AuthModule para DB_POOL

## Phase 2 — CSV Import module

- [X] T-007: Crear csv-import/csv-import.parser.ts — lógica pura de parseo CSV (columnas CrossChex)
- [X] T-008: Crear csv-import/csv-import.service.ts — validación, deduplicación, inserción DB
- [X] T-009: Crear csv-import/csv-import.controller.ts — POST /api/registros/import (multer, rol administrador)
- [X] T-010: Crear csv-import/csv-import.module.ts

## Phase 3 — Registros module

- [X] T-011: Crear registros/registros.service.ts — lista paginada con filtros
- [X] T-012: Crear registros/registros.controller.ts — GET /api/registros (rol administrador o supervisor)
- [X] T-013: Crear registros/registros.module.ts

## Phase 4 — Wire up

- [X] T-014: Actualizar app.module.ts — importar CsvImportModule y RegistrosModule

## Phase 5 — Tests

- [X] T-015: Crear webhooks/webhooks.service.test.ts — validación HMAC, dedup, inserción evento
- [X] T-016: Crear csv-import/csv-import.parser.test.ts — parseo, errores por fila, dedup hash
