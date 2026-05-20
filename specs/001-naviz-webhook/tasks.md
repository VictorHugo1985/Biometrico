# Tasks: Integración CrossChex Cloud

**Spec**: 001-naviz-webhook | **Branch**: `001-naviz-webhook`

## Phase 0 — Correcciones sobre spec 009

- [X] T-001: Corregir webhooks.service.ts — firma por comparación directa (no HMAC)
- [X] T-002: Corregir webhooks.controller.ts — siempre HTTP 200, nunca lanzar excepción por firma inválida
- [X] T-003: Actualizar webhooks.service.test.ts — ajustar tests de firma a comparación directa

## Phase 1 — Módulo CrossChex REST API

- [X] T-004: Crear crosschex/crosschex.types.ts — interfaces CrossChexAuthRequest/Response, CrossChexRecordsRequest/Response, CrossChexRecord, SyncResult
- [X] T-005: Crear crosschex/crosschex.service.ts — autenticación JWT (api_key/api_secret), token en memoria con renovación automática, syncHistorico con paginación
- [X] T-006: Crear crosschex/crosschex.controller.ts — POST /api/crosschex/sync, GET /api/crosschex/status (rol administrador)
- [X] T-007: Crear crosschex/crosschex.module.ts

## Phase 2 — Wire up

- [X] T-008: Actualizar app.module.ts — importar CrossChexModule
- [X] T-009: Agregar variables de entorno al .env — CROSSCHEX_API_KEY, CROSSCHEX_API_SECRET, CROSSCHEX_API_BASE_URL

## Phase 3 — Tests

- [X] T-010: Crear crosschex/crosschex.service.test.ts — autenticación, renovación token, sync con paginación, fallidos por workno no encontrado
