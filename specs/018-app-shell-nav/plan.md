# Implementation Plan: App Shell y Navegación Principal

**Branch**: `018-app-shell-nav` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-app-shell-nav/spec.md`

## Summary

Scaffolding completo de `apps/frontend` como aplicación Next.js 14 (Pages Router) con PrimeReact.
Incluye: layout de app shell con sidebar RBAC, protección de rutas vía middleware Next.js,
vista Home con tarjetas de módulos, y páginas placeholder para las 11 secciones funcionales
(a rellenar por specs 004–016). El Dashboard es la vista de destino al acceder autenticado.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x / Next.js 14

**Primary Dependencies**:
- `next@14`, `react@18`, `react-dom@18`
- `primereact@10`, `primeicons`, `primeflex`
- `js-cookie` + `@types/js-cookie` (lectura de cookie JWT)
- `@biometrico/types` (RolUsuario, UsuarioActual)

**Storage**: N/A — solo frontend; el JWT viene del backend (spec 004)

**Testing**: Vitest + `@testing-library/react` — tests del hook `useNavItems` (filtrado RBAC) y `useAuth` (parsing JWT)

**Target Platform**: Navegador moderno (Chrome 90+, Safari 14+, Firefox 88+); responsive mobile-first desde 320px

**Project Type**: Next.js SPA (Pages Router)

**Performance Goals**: Carga inicial < 3 s en 3G; navegación entre módulos < 1 s (client-side)

**Constraints**:
- Consistente con estructura `pages/` ya definida en specs 004 y 008
- PrimeReact como única biblioteca de componentes (sin Tailwind)
- Sin SSR para páginas protegidas (todo client-side con `useEffect` para evitar hydration mismatch con JWT)
- Token en cookie `biometrico_token`; en dev acepta también `localStorage`

**Scale/Scope**: ~11 módulos; ~4 roles; ~20 usuarios del sistema + ~150 colaboradores

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| I — Inmutabilidad biométrica | No | ✅ N/A — frontend de navegación pura |
| II — Cálculo determinístico | No | ✅ N/A |
| III — Reglas configurables | No | ✅ N/A |
| IV — Ciclo semanal | No | ✅ N/A |
| V — RBAC | Sí | ✅ Sidebar filtra ítems por `usuario.rol`; middleware redirige a 403 si rol insuficiente; `useNavItems()` garantiza que un rol no ve módulos ajenos |
| VI — Trazabilidad | No | ✅ N/A — navegación no genera eventos auditables |
| VII — Tiempo real | No | ✅ N/A — el polling de asistencia pertenece a spec 008 |
| VIII — Mobile-first | Sí | ✅ Sidebar como drawer en < 768 px; topbar con hamburger; tarjetas Home en grid responsive; todo el contenido usable desde 320 px |
| IX — Simplicidad UX | Sí | ✅ Una acción → una navegación; ítems del sidebar mínimos por rol; no hay modales de confirmación para navegar; menú sin sub-menús en v1 |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Documentation

```text
specs/018-app-shell-nav/
├── plan.md              ← este archivo
├── research.md          ← decisiones técnicas
├── data-model.md        ← tipos TypeScript del cliente
├── contracts/
│   └── ui-navigation.md ← API de componentes y config de rutas
├── quickstart.md        ← cómo correr y probar
└── tasks.md             ← generado por /speckit-tasks
```

### Source Code

```text
apps/frontend/
├── package.json                     # next 14, primereact 10, primeicons, primeflex, js-cookie
├── next.config.ts                   # basePath, env forwarding
├── tsconfig.json                    # paths: @/* → src/*
├── .env.example                     # NEXT_PUBLIC_API_URL=http://localhost:3001
└── src/
    ├── middleware.ts                 # Edge: redirigir a /login si no hay cookie
    ├── pages/
    │   ├── _app.tsx                  # <AuthProvider> + AppShell condicional por ruta
    │   ├── _document.tsx             # PrimeReact CSP nonce si aplica
    │   ├── index.tsx                 # Home: grid de ModuleCards filtradas por rol
    │   ├── 403.tsx                   # Acceso denegado + enlace Dashboard
    │   ├── 404.tsx                   # No encontrado + enlace Dashboard
    │   ├── login.tsx                 # placeholder — spec 004
    │   ├── recuperar-contrasena.tsx  # placeholder — spec 004
    │   ├── dashboard/index.tsx       # placeholder — spec 008
    │   ├── colaboradores/index.tsx   # placeholder — spec 006
    │   ├── liquidacion/index.tsx     # placeholder — spec 007
    │   ├── bonos/index.tsx           # placeholder — spec 010
    │   ├── notas/index.tsx           # placeholder — spec 011
    │   ├── pago-caja/index.tsx       # placeholder — spec 012
    │   ├── configuracion/index.tsx   # placeholder — spec 013
    │   ├── justificaciones/index.tsx # placeholder — spec 014
    │   ├── usuarios/index.tsx        # placeholder — spec 015
    │   ├── reportes/index.tsx        # placeholder — spec 016
    │   └── ingesta/index.tsx         # placeholder — spec 009
    ├── components/
    │   ├── shell/
    │   │   ├── AppShell.tsx          # layout: sidebar + topbar + <main>
    │   │   ├── AppSidebar.tsx        # PanelMenu/nav con ítems filtrados
    │   │   ├── TopBar.tsx            # barra superior móvil + hamburger + logout
    │   │   └── ModuleCard.tsx        # Card de PrimeReact para vista Home
    │   └── common/
    │       └── AccessDenied.tsx      # mensaje 403 reutilizable
    ├── config/
    │   └── navigation.ts             # NAV_ITEMS + MODULE_DESCRIPTIONS
    ├── hooks/
    │   ├── useAuth.ts                # leer/decodificar JWT, logout
    │   ├── useNavItems.ts            # filtrar NAV_ITEMS por rol
    │   └── useSidebar.ts             # estado open/close del drawer móvil
    └── providers/
        └── AuthProvider.tsx          # Context de autenticación
```

**Structure Decision**: Next.js Pages Router consistente con specs 004 y 008. `apps/frontend/` como workspace npm del monorepo. Sin backend changes en esta spec.

## Complexity Tracking

No hay violaciones constitucionales que justificar.
