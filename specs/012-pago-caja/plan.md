# Implementation Plan: Gestión de Pago por Caja

**Branch**: `012-pago-caja` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Vista exclusiva del rol Caja: lista consolidados de liquidación aprobados por el supervisor y
pendientes de pago, permite agregar ajustes (descuentos o incrementos con motivo obligatorio)
sobre el monto calculado, y confirma el pago registrando fecha, monto y método. Una vez
confirmado, el consolidado es inmutable. El colaborador ve el estado de su pago en su historial.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `@biometrico/types`, `@biometrico/utils` (formatBs)
- Frontend: Next.js 14, PrimeReact (`DataTable`, `Tag`, `InputNumber`, `ConfirmDialog`, `Sidebar`)

**Storage**: PostgreSQL — `resultados_nomina`, `ajustes_caja`, `confirmaciones_pago` (migration 003)

**Testing**: Vitest — tests de recálculo de total con ajustes (descuento + incremento), tests de
bloqueo post-confirmación, tests de total negativo rechazado, tests de diferencia con motivo

**Constraints**:
- `ajustes_caja`: tipo (`descuento` | `incremento`), monto > 0, motivo obligatorio
- `chk_anulacion_completa` en `ajustes_caja`: si `anulado=true`, `anulado_por` y `anulado_en` NOT NULL
- Total final = monto_supervisor + SUM(incrementos) − SUM(descuentos); no puede ser negativo
- Confirmación exige motivo si `monto_pagado ≠ total_calculado_final`
- Período confirmado = inmutable (Principio I aplicado a pagos)
- Cajero no accede a registros biométricos, configuración ni bonos (Principio V)

**Scale/Scope**: ~200 colaboradores × 1 consolidado/semana = ~200 confirmaciones/semana

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | Sí | ✅ Confirmación de pago es inmutable; ajustes de Caja solo antes de confirmar |
| V — RBAC | Sí | ✅ Caja: vista de pagos únicamente; Admin: todo; Colaborador: lectura de su estado |
| VI — Trazabilidad | Sí | ✅ `gestionado_por` + `gestionado_en` en ajustes; `cajero_id` + `confirmado_en` en confirmaciones |
| VIII — Mobile-first | Sí | ✅ Lista de pendientes en tarjetas verticales; ajustes en Sidebar lateral |
| IX — Simplicidad UX | Sí | ✅ Flujo lineal: lista → detalle → ajustes → confirmar; sin modales anidados |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── caja/
    ├── caja.router.ts                # GET /caja/pendientes, GET /caja/:id, POST /caja/:id/ajustes,
    │                                 # DELETE /caja/:id/ajustes/:ajusteId, POST /caja/:id/confirmar
    ├── caja.service.ts               # lista pendientes, agregar/eliminar ajustes, confirmar pago
    ├── ajustes.calculator.ts         # total_final = base + incrementos − descuentos; validar ≥ 0
    └── caja.service.test.ts

apps/frontend/src/
├── pages/caja/
│   ├── index.tsx                     # lista de consolidados pendientes de pago
│   └── [id].tsx                      # detalle: desglose + ajustes + botón confirmar
└── components/caja/
    ├── ConsolidadoCard.tsx           # tarjeta en lista de pendientes
    ├── AjusteCajaForm.tsx            # form inline: tipo + monto + motivo
    ├── ResumenPago.tsx               # monto original + ajustes + total final
    └── ConfirmarPagoDialog.tsx       # fecha + monto + método + motivo diferencia
```
