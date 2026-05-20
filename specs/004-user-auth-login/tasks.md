# Tasks: Autenticación de Usuarios

**Spec**: 004-user-auth-login | **Branch**: `004-user-auth-login`

## Phase 0 — Setup

- [X] T-001: Instalar dependencias auth (`jsonwebtoken`, `bcrypt`, `@types/jsonwebtoken`, `@types/bcrypt`, `nodemailer`, `@types/nodemailer`)
- [X] T-002: Crear módulo NestJS `auth/` con estructura base (module, controller, services)

## Phase 1 — Core Services

- [X] T-003: Implementar `password.service.ts` — hash, verify, validatePolicy (bcrypt cost 12)
- [X] T-004: Implementar `session.service.ts` — crear, invalidar, verificar sesión en DB
- [X] T-005: Implementar `auth.service.ts` — login, logout, verifyJWT, changePassword
- [X] T-006: Implementar `recovery.service.ts` — generar token, enviar email, validar, cambiar contraseña

## Phase 2 — HTTP Layer

- [X] T-007: Implementar `auth.controller.ts` — POST /auth/login, /auth/logout, /auth/recuperar, /auth/recuperar/confirmar
- [X] T-008: Implementar `auth.guard.ts` (NestJS Guard) — validar JWT + estado sesión + rol

## Phase 3 — Integration

- [X] T-009: Registrar AuthModule en AppModule
- [X] T-010: Agregar variables de entorno (JWT_SECRET, JWT_EXPIRES_IN, SMTP_*)

## Phase 4 — Tests

- [X] T-011: Tests unitarios `password.service` — hash, verify, validatePolicy
- [X] T-012: Tests unitarios `auth.service` — login (correcto, credenciales inválidas, cuenta inactiva, contrasena_temporal)
