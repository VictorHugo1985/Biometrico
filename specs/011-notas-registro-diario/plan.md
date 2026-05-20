# Implementation Plan: Notas y Adjuntos en Registro Diario

**Branch**: `011-notas-registro-diario` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Permite al supervisor registrar un comentario de texto libre (máx. 500 caracteres) y adjuntar un
archivo (JPEG, PNG, PDF, máx. 10 MB) por día por colaborador en el desglose de asistencia. Los
adjuntos se almacenan en Supabase Storage. Todo es inmutable una vez aprobado el período. El
colaborador tiene acceso de solo lectura a sus propias notas.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2 (Storage + DB), `@biometrico/utils` (validateFile)
- Frontend: Next.js 14, PrimeReact (`FileUpload`, `InputTextarea`, `Image`, `Sidebar`, `Badge`)

**Storage**:
- PostgreSQL — `notas_asistencia`, `adjuntos_nota` (migration 005)
- Supabase Storage — bucket `adjuntos-asistencia` (privado, URL firmada 60 min)

**Testing**: Vitest — tests de validación de tipo/tamaño de archivo, tests de bloqueo por período aprobado

**Performance Goals**: Carga de adjunto < 5 segundos para archivo de 10 MB (SC-001)

**Constraints**:
- Un solo adjunto por día por colaborador en v1 (reemplazable antes de aprobación)
- Adjuntos reemplazados se conservan en auditoría (estado `reemplazado`)
- Período aprobado = inmutabilidad total de notas y adjuntos (Principio I)
- Supervisor solo accede a colaboradores de su área (Principio V)
- Comentario y adjunto son independientes: puede existir uno sin el otro

**Scale/Scope**: ~200 colaboradores × 6 días = ~1.200 notas posibles por semana; adjuntos en Supabase Storage

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | Sí | ✅ Notas/adjuntos en período aprobado son inmutables |
| V — RBAC | Sí | ✅ Supervisor escribe (su área); Colaborador lee (sus propias); Admin todo |
| VI — Trazabilidad | Sí | ✅ `creado_por`, `modificado_en` en notas; historial de adjuntos reemplazados |
| VIII — Mobile-first | Sí | ✅ Input de nota inline en el desglose; FileUpload compacto en móvil |
| IX — Simplicidad UX | Sí | ✅ Nota editable in-place; un clic para adjuntar; indicador visual mínimo por día |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── notas/
    ├── notas.router.ts              # GET/POST/PUT/DELETE /api/notas/:colaboradorId/:fecha
    ├── notas.service.ts             # CRUD + validación de período + auditoría
    ├── adjuntos.service.ts          # upload/replace/delete en Supabase Storage
    └── notas.service.test.ts

apps/frontend/src/
├── pages/asistencia/[colaboradorId]/desglose.tsx   # desglose diario con notas integradas
└── components/notas/
    ├── NotaDiaInline.tsx            # input de texto + upload compacto por día
    ├── AdjuntoViewer.tsx            # imagen inline o botón descarga PDF
    └── IndicadorNota.tsx            # badge/icono en días con nota o adjunto
```
