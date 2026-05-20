# Implementation Plan: Gestión de Usuarios y Roles

**Branch**: `015-gestion-usuarios` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

CRUD administrativo de cuentas de usuario sobre las tablas `usuarios`, `sesiones_usuario` y
`tokens_recuperacion` (migration 001 + custom auth de spec 004). El administrador crea, edita,
desactiva y restablece contraseñas. Protección del último administrador activo. Generación de
contraseña temporal que expira al primer uso. Cambio de contraseña propio para todos los roles.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `@supabase/supabase-js` v2, `bcrypt` (cost 12), `@biometrico/types`
- Frontend: Next.js 14, PrimeReact (`DataTable`, `Dialog`, `Password`, `Dropdown`, `Tag`)

**Storage**: PostgreSQL — `usuarios`, `sesiones_usuario`, `intentos_login` (migration 001)

**Testing**: Vitest — tests de protección del último admin, tests de contraseña temporal (expiración
al primer uso), tests de expiración de sesiones al desactivar cuenta

**Constraints**:
- `bcrypt` cost 12 (consistente con spec 004)
- Contraseña mínima: 8 caracteres con al menos 1 letra y 1 número
- Contraseña temporal: generada con `crypto.randomBytes(12).toString('hex')`, estado `temporal=true` en `usuarios`
- Al desactivar cuenta: `UPDATE sesiones_usuario SET estado='expirado' WHERE usuario_id=? AND estado='activo'`
- No desactivar si es el único `administrador` con `activo=true`
- Cambio de contraseña propio cierra todas las demás sesiones activas del usuario

**Scale/Scope**: ~200 cuentas de colaboradores + ~10 supervisores + ~3 cajeros + ~2 admins

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| V — RBAC | Sí | ✅ Solo admin crea/edita/desactiva; usuario puede cambiar su propia contraseña |
| VI — Trazabilidad | Sí | ✅ `creado_por`, `modificado_por`, `modificado_en` en `usuarios`; auditoría de acciones |
| IX — Simplicidad UX | Sí | ✅ Tabla de usuarios con filtro + modal de creación/edición en 1 paso |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── usuarios/
    ├── usuarios.router.ts           # GET /usuarios, POST /usuarios, PATCH /:id, DELETE /:id (desactivar)
    ├── usuarios.service.ts          # CRUD + validación último admin + expiración sesiones
    ├── password.service.ts          # hash, verify, generate-temp (reutiliza spec 004)
    └── usuarios.service.test.ts

apps/frontend/src/
├── pages/admin/usuarios/
│   ├── index.tsx                    # tabla de usuarios con filtros
│   └── [id].tsx                     # detalle/edición de cuenta
└── components/usuarios/
    ├── UsuarioForm.tsx              # formulario creación/edición
    ├── RestablecerPasswordDialog.tsx
    └── CambiarPasswordForm.tsx      # formulario para el propio usuario
```
