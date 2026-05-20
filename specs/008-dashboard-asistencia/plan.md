# Implementation Plan: Dashboard de Asistencia en Fábrica

**Branch**: `008-dashboard-asistencia` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Dashboard en tiempo real que muestra el estado de asistencia del día actual para todos los
colaboradores activos, agrupados por área/departamento. Identifica presentes (con al menos 1
evento biométrico hoy en COT) y ausentes (con horario asignado pero sin eventos). Refresco
automático cada 30 segundos. Clic en colaborador muestra detalle de sus marcaciones del día.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `@biometrico/utils` (toCoT)
- Frontend: Next.js 14, PrimeReact (`DataView`, `Panel`, `Badge`, `Sidebar`, `InputText`)
- Polling: `setInterval` 30s en el cliente (sin WebSocket en v1)

**Storage**: PostgreSQL — `eventos_biometricos`, `colaboradores`, `departamentos`, `asignaciones_horario`

**Testing**: Vitest — tests de lógica de "presente" vs "ausente" (edge case: turno nocturno que cruza medianoche), tests de filtros

**Performance Goals**: Carga inicial < 3 segundos con 200 colaboradores (SC-001); búsqueda < 1 segundo (SC-005)

**Constraints**:
- "Presente" = al menos 1 evento en el día actual en zona COT (America/Bogota)
- "Ausente" = activo + tiene horario para ese día + sin eventos
- Sin horario asignado para hoy = NO aparece en ausentes
- Sin área asignada → sección "Sin área asignada"
- Roles: administrador y supervisor ven todo; colaborador sin acceso

**Scale/Scope**: ~200 colaboradores; ~10 departamentos; refresco 30s

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | Sí | ✅ Solo lectura de `eventos_biometricos` |
| VII — Disponibilidad tiempo real | Sí | ✅ Refresco 30s; latencia evento→dashboard ≤ 60s (Principio VII) |
| V — RBAC | Sí | ✅ Admin y supervisor; colaborador sin acceso |
| VIII — Mobile-first | Sí | ✅ Vista de áreas en tarjetas verticales; detalle en Sidebar deslizante |
| IX — Simplicidad UX | Sí | ✅ Todo en una pantalla; búsqueda sin submit; sin navegación extra para ver detalle |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── dashboard/
    ├── dashboard.router.ts          # GET /api/dashboard/asistencia
    ├── dashboard.service.ts         # calcular presente/ausente por día COT
    ├── dashboard.types.ts           # EstadoAsistenciaDia, ResumenArea
    └── dashboard.service.test.ts

apps/frontend/src/
├── pages/dashboard/
│   └── index.tsx                   # layout: header resumen + grid por áreas + sidebar detalle
└── components/dashboard/
    ├── ResumenGlobal.tsx            # total esperado / presentes / ausentes / %
    ├── AreaCard.tsx                 # tarjeta por departamento con lista de colaboradores
    ├── ColaboradorBadge.tsx         # badge verde/rojo con nombre
    ├── DetalleColaboradorSidebar.tsx # panel lateral con marcaciones del día
    └── BuscadorDashboard.tsx        # búsqueda con debounce 300ms
```
