# Implementation Plan: Gestión de Colaboradores

**Branch**: `006-gestion-colaboradores` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

CRUD completo de colaboradores con asignación de área (departamento), perfil de tarifa
(`reglas_nomina`) y horario (`plantillas_horario`). Solo el rol administrador puede crear,
editar o dar de baja; el supervisor puede consultar. Incluye búsqueda por nombre/workno y
filtros por área y estado. Workno (`codigo_empleado`) es único entre colaboradores activos.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `@biometrico/types`
- Frontend: Next.js 14, PrimeReact (`DataTable`, `Dialog`, `Dropdown`, `InputText`)
- Shared: `@biometrico/types` (Colaborador, Departamento), `@biometrico/utils` (isValidCodigoEmpleado)

**Storage**: PostgreSQL — `colaboradores`, `departamentos`, `asignaciones_horario`, `asignaciones_regla_nomina`

**Testing**: Vitest — tests de validación de workno único, tests de filtros

**Target Platform**: Node 20.x + Next.js 14 (mobile-first, Principio VIII)

**Constraints**:
- Workno único entre activos (FK a `colaboradores.codigo_empleado` con UNIQUE)
- Baja lógica únicamente (`activo = false`); NO eliminar físicamente
- Cambios registrados con `creado_por` + timestamp (trazabilidad Principio VI)
- No asignar perfiles/horarios desactivados

**Scale/Scope**: ~200 colaboradores; ~10 departamentos; ~5 perfiles de tarifa; ~5 plantillas de horario

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I | No | ✅ N/A |
| II | No | ✅ N/A |
| III — Reglas configurables | Sí | ✅ Asignación de tarifa y horario por colaborador override de departamento |
| IV | No | ✅ N/A |
| V — RBAC | Sí | ✅ Admin: CRUD completo; Supervisor: solo lectura |
| VI — Trazabilidad | Sí | ✅ `creado_por` en colaboradores y asignaciones |
| VII | No | ✅ N/A |
| VIII — Mobile-first | Sí | ✅ Formulario columna única; tabla colapsa a tarjetas en móvil |
| IX — Simplicidad UX | Sí | ✅ Error claro en workno duplicado; lista filtrable sin pasos extra |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── colaboradores/
    ├── colaboradores.router.ts     # GET, POST, PATCH, DELETE /api/colaboradores
    ├── colaboradores.service.ts    # CRUD + validación workno único
    ├── colaboradores.types.ts
    └── colaboradores.service.test.ts

apps/frontend/src/
├── pages/colaboradores/
│   ├── index.tsx                   # Lista con filtros y búsqueda
│   └── [id].tsx                    # Formulario alta/edición
└── components/colaboradores/
    ├── ColaboradorForm.tsx
    ├── ColaboradoresTable.tsx
    └── BajaColaboradorDialog.tsx
```
