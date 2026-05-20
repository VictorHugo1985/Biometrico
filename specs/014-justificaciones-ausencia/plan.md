# Implementation Plan: Justificaciones de Ausencia

**Branch**: `014-justificaciones-ausencia` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

El supervisor registra justificaciones de ausencia (tipos configurables: médica, licencia con/sin
pago, personal, otro) para días sin marcaciones biométricas. El administrador aprueba o rechaza.
Las justificaciones aprobadas de tipo "con pago" eliminan el descuento por ausencia en la
liquidación semanal. El catálogo de tipos se gestiona en `tipos_justificacion_catalogo` (migration 007).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `@biometrico/types`, `@biometrico/utils` (validateFile)
- Frontend: Next.js 14, PrimeReact (`DataTable`, `Tag`, `Dialog`, `Dropdown`, `FileUpload`)

**Storage**: PostgreSQL — `justificaciones` (vinculada a `tipos_justificacion_catalogo` via FK, migration 007),
adjuntos en Supabase Storage (bucket `adjuntos-justificaciones`)

**Testing**: Vitest — tests de efecto en liquidación (con pago, sin pago, pendiente, sin justificación),
tests de bloqueo por período aprobado, tests de unicidad (una justificación por colaborador por día)

**Constraints**:
- Una justificación por colaborador por día (unique constraint)
- Solo días sin marcaciones biométricas justificables
- Período aprobado = no se pueden agregar/modificar/aprobar justificaciones (Principio I)
- Flujo: supervisor registra (estado `pendiente`) → admin aprueba/rechaza
- Rechazo exige motivo obligatorio
- Tipos configurables en `tipos_justificacion_catalogo` con flag `con_pago BOOLEAN`

**Scale/Scope**: ~200 colaboradores × 6 días; volumen de justificaciones bajo (~10–30 por semana)

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | Sí | ✅ Eventos biométricos no se modifican; justificación es capa semántica adicional |
| II — Cálculo determinístico | Sí | ✅ Efecto en liquidación determinado por `con_pago` del tipo en catálogo |
| III — Reglas configurables | Sí | ✅ Catálogo de tipos gestionado en DB por el administrador |
| V — RBAC | Sí | ✅ Supervisor: registra (su área); Admin: aprueba/rechaza todo; Colaborador: lectura |
| VI — Trazabilidad | Sí | ✅ `registrado_por`, `aprobado_por`, `motivo_rechazo` en justificaciones |
| IX — Simplicidad UX | Sí | ✅ Flujo en 2 pantallas: desglose del día → modal justificación; sin sub-modales |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── justificaciones/
    ├── justificaciones.router.ts        # GET/POST /justificaciones, PATCH /:id/aprobar|rechazar
    ├── justificaciones.service.ts       # CRUD + validación de unicidad/período + efecto en liquidación
    ├── catalogo.service.ts              # CRUD de tipos_justificacion_catalogo (admin only)
    └── justificaciones.service.test.ts

apps/frontend/src/
├── pages/justificaciones/
│   ├── index.tsx                        # lista de pendientes para el admin
│   └── [colaboradorId].tsx             # historial de justificaciones del colaborador
└── components/justificaciones/
    ├── JustificacionDialog.tsx          # modal: tipo + motivo + adjunto
    ├── AprobacionPanel.tsx              # acciones aprobar/rechazar para el admin
    └── EstadoTag.tsx                    # tag pendiente/aprobado/rechazado
```
