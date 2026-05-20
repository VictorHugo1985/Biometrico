# Implementation Plan: Autenticación de Usuarios

**Branch**: `004-user-auth-login` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Sistema de autenticación custom con tablas propias (`sesiones_usuario`, `tokens_recuperacion`,
`intentos_login`). El backend emite y valida JWTs propios almacenados en `sesiones_usuario`.
Incluye login, logout, recordar credenciales (30 días), recuperación de contraseña por email
con token de un solo uso (60 min), e invalidación de sesiones al cambiar contraseña.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `jsonwebtoken`, `bcrypt`, `@supabase/supabase-js` v2, `nodemailer` (reset email)
- Frontend: Next.js 14, PrimeReact, `js-cookie` (token storage)
- Shared: `@biometrico/types` (Usuario, Sesion, RolUsuario)

**Storage**: PostgreSQL — `usuarios`, `sesiones_usuario`, `tokens_recuperacion`, `intentos_login`

**Testing**: Vitest; tokens generados con claves de prueba; no mock de DB (tests de integración)

**Target Platform**: Node 20.x server + Next.js 14

**Performance Goals**: Login < 3 segundos (incluyendo bcrypt verify)

**Constraints**:
- NO Supabase Auth — autenticación completamente custom
- Sesiones concurrentes permitidas (múltiples dispositivos)
- Al cambiar contraseña → invalidar TODAS las sesiones del usuario
- Token de recuperación: 1 uso, 60 min de vigencia
- Contraseña: mínimo 8 chars con letras y números

**Scale/Scope**: 4 roles; ~20 usuarios del sistema (admins, supervisores, cajeros); ~150 colaboradores (acceso self-service)

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I–IV | No | ✅ N/A |
| V — RBAC | Sí | ✅ Token incluye rol; middleware verifica en cada endpoint protegido |
| VI — Trazabilidad | Sí | ✅ `intentos_login` registra todos los intentos con IP y resultado |
| VII — Tiempo real | No | ✅ N/A |
| VIII — Mobile-first | Sí | ✅ Pantalla de login columna única; form responsive |
| IX — Simplicidad UX | Sí | ✅ Error genérico (no revela correo vs. contraseña); flujo mínimo de 2 pasos |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Documentation

```text
specs/004-user-auth-login/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── api-auth.md
├── quickstart.md
└── tasks.md
```

### Source Code

```text
apps/backend/src/
└── auth/
    ├── auth.router.ts           # POST /login, POST /logout, POST /refresh, POST /recuperar
    ├── auth.service.ts          # login, logout, verifyToken, changePassword
    ├── auth.middleware.ts       # requireAuth(roles[]) — usado por todos los demás routers
    ├── auth.types.ts            # JWTPayload, LoginRequest, LoginResponse
    ├── password.service.ts      # bcrypt hash/verify, política de contraseña
    ├── session.service.ts       # crear/invalidar sesiones en DB
    ├── recovery.service.ts      # generar token, enviar email, validar y cambiar
    └── auth.service.test.ts

apps/frontend/src/
├── pages/
│   ├── login.tsx                # Form login + "recordar contraseña"
│   └── recuperar-contrasena.tsx # Solicitar reset / form nueva contraseña
└── hooks/
    └── useAuth.ts               # context: usuario actual, rol, logout
```

**Structure Decision**: Módulo `auth/` auto-contenido en el backend. `auth.middleware.ts` es el
único artefacto exportado al resto de los módulos (protección de rutas). El frontend mantiene
el token en cookie HttpOnly (securidad) con fallback a localStorage para desarrollo.
