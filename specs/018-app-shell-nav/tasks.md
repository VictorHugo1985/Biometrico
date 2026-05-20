# Tasks: App Shell y Navegación Principal

**Spec**: 018-app-shell-nav | **Branch**: `018-app-shell-nav`

**Stack**: Next.js 14 (Pages Router) · PrimeReact 10 · PrimeFlex · TypeScript 5 · js-cookie

**Organization**: Tasks grouped by user story for independent implementation and testing.

---

## Phase 1: Setup — Workspace del Frontend

**Purpose**: Crear el workspace `apps/frontend` con dependencias y configuración base del proyecto.

- [X] T001 Create `apps/frontend/package.json` with dependencies: next@14, react@18, react-dom@18, primereact@10, primeicons, primeflex, js-cookie, @biometrico/types; devDependencies: typescript, @types/react, @types/node, @types/js-cookie, eslint, eslint-config-next
- [X] T002 Create `apps/frontend/next.config.ts` — forward `NEXT_PUBLIC_API_URL` from env; configure reactStrictMode
- [X] T003 [P] Create `apps/frontend/tsconfig.json` — paths: `@/*` → `./src/*`; target ES2020; strict mode
- [X] T004 [P] Create `apps/frontend/.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## Phase 2: Foundational — Infraestructura Compartida

**Purpose**: Contexto de autenticación, configuración de navegación y middleware. Bloqueantes para todas las historias.

**⚠️ CRITICAL**: No se puede implementar ninguna historia de usuario hasta completar esta fase.

- [X] T005 Create `apps/frontend/src/config/navigation.ts` — NAV_ITEMS array (11 módulos con key, label, icon PrimeIcons, href, roles[]) + MODULE_DESCRIPTIONS record, según contrato `contracts/ui-navigation.md`
- [X] T006 Create `apps/frontend/src/providers/AuthProvider.tsx` — React Context que lee cookie `biometrico_token`, decodifica JWT (atob/base64), expone `{ usuario, isLoading, isAuthenticated, logout }`; logout llama `POST /api/auth/logout` y borra cookie
- [X] T007 Create `apps/frontend/src/hooks/useAuth.ts` — `useAuth()` hook que consume AuthContext; lanza error si se usa fuera de AuthProvider
- [X] T008 Create `apps/frontend/src/hooks/useNavItems.ts` — `useNavItems()`: filtra `NAV_ITEMS` por `usuario.rol` del contexto; retorna `[]` mientras `isLoading === true`
- [X] T009 Create `apps/frontend/src/middleware.ts` — Next.js Edge middleware: si ruta no está en `PUBLIC_ROUTES` y no hay cookie `biometrico_token` → `NextResponse.redirect('/login?redirect=<pathname>')`; PUBLIC_ROUTES = ['/login', '/recuperar-contrasena', '/403', '/404']
- [X] T010 [P] Create `apps/frontend/src/pages/_document.tsx` — `<Html lang="es">`, importar estilos PrimeReact y PrimeFlex vía `<link>` en `<Head>`
- [X] T011 Create `apps/frontend/src/pages/_app.tsx` — envuelve en `<AuthProvider>`; importa `primereact/resources/themes/lara-light-blue/theme.css`, `primereact/resources/primereact.min.css`, `primeicons/primeicons.css`, `primeflex/primeflex.css`; renderiza `<AppShell>` para rutas autenticadas (excluir PUBLIC_ROUTES)

**Checkpoint**: Infraestructura lista — implementación de historias puede comenzar.

---

## Phase 3: User Story 1 — Dashboard como Vista Inicial (Priority: P1) 🎯 MVP

**Goal**: Un usuario autenticado que accede a la app aterriza en el Dashboard. El AppShell (sidebar + topbar) es visible en todas las páginas autenticadas.

**Independent Test**: Acceder a `http://localhost:3000` con sesión activa → aparece sidebar con ítem "Dashboard" resaltado y la página `/dashboard`.

### Implementación US1

- [X] T012 [US1] Create `apps/frontend/src/components/shell/AppShell.tsx` — layout: `<div className="flex">` con `<AppSidebar>` a la izquierda y `<main className="flex-1">` a la derecha; `<TopBar>` en la parte superior del área de contenido; aplica autenticación guard: si `!isAuthenticated && !isLoading` → `router.push('/login')`
- [X] T013 [US1] Create `apps/frontend/src/components/shell/TopBar.tsx` — barra superior con nombre de la app ("Biométrico"), nombre de usuario actual y botón "Cerrar sesión" que llama `logout()`
- [X] T014 [US1] Create `apps/frontend/src/components/shell/AppSidebar.tsx` — sidebar con `<nav>` que renderiza lista de `NavItem` (ítems filtrados por `useNavItems()`); resalta ítem activo comparando `href` con `useRouter().pathname`; ancho fijo 250px
- [X] T015 [US1] Create `apps/frontend/src/pages/dashboard/index.tsx` — página placeholder con título "Dashboard de Asistencia" y aviso "Módulo en desarrollo — spec 008"; protegida por rol: administrador, supervisor
- [X] T016 [US1] Create `apps/frontend/src/pages/login.tsx` — página pública placeholder con formulario mínimo (correo + contraseña + botón); al submit → `POST /api/auth/login` → guarda cookie `biometrico_token` → redirect a `/dashboard`
- [X] T017 [US1] Create `apps/frontend/src/pages/recuperar-contrasena.tsx` — placeholder público con campo correo y botón; aviso "Módulo completo en spec 004"
- [X] T018 [US1] Create `apps/frontend/src/pages/403.tsx` — página pública: "Acceso denegado" + descripción + enlace "Ir al Dashboard"; sin AppShell
- [X] T019 [US1] Create `apps/frontend/src/pages/404.tsx` — página pública: "Página no encontrada" + enlace "Ir al Dashboard"; sin AppShell

**Checkpoint**: Usuario puede autenticarse, ver el AppShell con sidebar y acceder al Dashboard.

---

## Phase 4: User Story 2 — Navegación por Sidebar con RBAC (Priority: P1)

**Goal**: El sidebar muestra solo los módulos permitidos para el rol del usuario. Navegar a un módulo resalta el ítem y carga la página. Acceder a ruta fuera del rol muestra 403.

**Independent Test**: Login con rol `caja` → sidebar muestra solo "Pago por Caja"; navegar a `/dashboard` manualmente → redirección a `/403`.

### Implementación US2

- [X] T020 [US2] Update `apps/frontend/src/pages/_app.tsx` — agregar guard de rol: leer `pageRoles` de `Component.requiredRoles` (array estático en cada página); si `usuario.rol` no está en `pageRoles` → redirect a `/403`
- [X] T021 [P] [US2] Create `apps/frontend/src/pages/colaboradores/index.tsx` — placeholder "Gestión de Colaboradores — spec 006"; `requiredRoles = ['administrador', 'supervisor']`
- [X] T022 [P] [US2] Create `apps/frontend/src/pages/liquidacion/index.tsx` — placeholder "Liquidación Semanal — spec 007"; `requiredRoles = ['administrador']`
- [X] T023 [P] [US2] Create `apps/frontend/src/pages/bonos/index.tsx` — placeholder "Bonos Diarios — spec 010"; `requiredRoles = ['administrador', 'supervisor']`
- [X] T024 [P] [US2] Create `apps/frontend/src/pages/notas/index.tsx` — placeholder "Notas de Registro — spec 011"; `requiredRoles = ['administrador', 'supervisor']`
- [X] T025 [P] [US2] Create `apps/frontend/src/pages/pago-caja/index.tsx` — placeholder "Pago por Caja — spec 012"; `requiredRoles = ['administrador', 'caja']`
- [X] T026 [P] [US2] Create `apps/frontend/src/pages/configuracion/index.tsx` — placeholder "Configuración del Sistema — spec 013"; `requiredRoles = ['administrador']`
- [X] T027 [P] [US2] Create `apps/frontend/src/pages/justificaciones/index.tsx` — placeholder "Justificaciones — spec 014"; `requiredRoles = ['administrador', 'supervisor']`
- [X] T028 [P] [US2] Create `apps/frontend/src/pages/usuarios/index.tsx` — placeholder "Gestión de Usuarios — spec 015"; `requiredRoles = ['administrador']`
- [X] T029 [P] [US2] Create `apps/frontend/src/pages/reportes/index.tsx` — placeholder "Reportes — spec 016"; `requiredRoles = ['administrador', 'supervisor']`
- [X] T030 [P] [US2] Create `apps/frontend/src/pages/ingesta/index.tsx` — placeholder "Ingesta Biométrica — spec 009"; `requiredRoles = ['administrador']`

**Checkpoint**: Todos los módulos tienen ruta; el RBAC bloquea acceso cruzado entre roles.

---

## Phase 5: User Story 3 — Vista General de Módulos / Home (Priority: P2)

**Goal**: La ruta `/` muestra una cuadrícula de tarjetas con todos los módulos accesibles para el rol del usuario, con nombre, ícono y descripción.

**Independent Test**: Login como administrador → navegar a `http://localhost:3000/` → se ven 11 tarjetas de módulo; login como `caja` → se ve solo 1 tarjeta (Pago por Caja).

### Implementación US3

- [X] T031 [US3] Create `apps/frontend/src/components/shell/ModuleCard.tsx` — PrimeReact `<Card>` con `<i>` de PrimeIcons, título del módulo, descripción de `MODULE_DESCRIPTIONS`, y `<Link>` de Next.js; props: `item: NavItem`, `description: string`
- [X] T032 [US3] Create `apps/frontend/src/pages/index.tsx` — Home page: título "Inicio", subtítulo con nombre del usuario, `<div className="grid">` con `<ModuleCard>` por cada ítem de `useNavItems()`; `requiredRoles` vacío (todos los roles autenticados)

**Checkpoint**: Vista Home funcional con tarjetas filtradas por rol.

---

## Phase 6: User Story 4 — Sidebar Colapsable en Móvil (Priority: P3)

**Goal**: En viewport < 768 px el sidebar se abre como drawer al tocar el ícono hamburger en la TopBar y se cierra al navegar.

**Independent Test**: Abrir en viewport 375px → sidebar oculto → tocar hamburger → drawer aparece → seleccionar un ítem → drawer cierra.

### Implementación US4

- [X] T033 [US4] Create `apps/frontend/src/hooks/useSidebar.ts` — `useState<boolean>` para `isOpen`; retorna `{ isOpen, open, close, toggle }`
- [X] T034 [US4] Update `apps/frontend/src/components/shell/TopBar.tsx` — agregar botón hamburger (`<Button icon="pi pi-bars">`) visible solo en móvil (`block lg:hidden`); llama `toggle()` de `useSidebar`; prop: `onMenuToggle: () => void`
- [X] T035 [US4] Update `apps/frontend/src/components/shell/AppShell.tsx` — instanciar `useSidebar()`; pasar `onMenuToggle` a `<TopBar>`; renderizar `<Sidebar>` de PrimeReact (overlay drawer) en móvil con `visible={isOpen}` y `onHide={close}`; sidebar desktop permanece siempre visible con `className="hidden lg:block"`
- [X] T036 [US4] Update `apps/frontend/src/components/shell/AppSidebar.tsx` — cada `<Link>` de navegación llama `onNavigate?.()` después del click; prop opcional `onNavigate?: () => void` para cerrar el drawer móvil tras seleccionar ítem

**Checkpoint**: Sidebar funcionando como drawer en móvil; desktop sin cambios.

---

## Phase 7: Polish y Ajustes Finales

- [X] T037 [P] Update root `package.json` — agregar scripts: `"frontend:dev": "npm run dev --workspace=apps/frontend"`, `"frontend:build": "npm run build --workspace=apps/frontend"`
- [X] T038 [P] Update `.gitignore` raíz — agregar `apps/frontend/.next/`, `apps/frontend/out/` si no están presentes
- [X] T039 Create `apps/frontend/src/components/common/AccessDenied.tsx` — componente reutilizable para páginas 403: ícono, mensaje y botón "Volver al Dashboard"
- [X] T040 Validate all 4 quickstart.md flows manually in browser (auth → Dashboard, RBAC sidebar, mobile drawer, Home cards)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias — puede comenzar de inmediato
- **Phase 2 (Foundational)**: Depende de Phase 1 — **BLOQUEA** todas las historias
- **Phase 3 (US1 — P1)**: Depende de Phase 2 — MVP mínimo viable
- **Phase 4 (US2 — P1)**: Depende de Phase 3 (requiere AppShell funcionando)
- **Phase 5 (US3 — P2)**: Depende de Phase 2 — puede implementarse en paralelo con US2 si hay capacidad
- **Phase 6 (US4 — P3)**: Depende de Phase 3 (requiere TopBar y AppShell)
- **Phase 7 (Polish)**: Depende de todas las historias deseadas

### User Story Dependencies

- **US1 (P1)**: Puede iniciar tras Phase 2. No depende de otras historias.
- **US2 (P1)**: Depende de US1 (AppShell y páginas base deben existir).
- **US3 (P2)**: Depende de Phase 2 (`useNavItems`, `navigation.ts`). Puede ir en paralelo con US2.
- **US4 (P3)**: Depende de US1 (TopBar y AppShell deben existir).

### Within Each Phase

- Tasks `[P]` dentro de la misma fase pueden ejecutarse en paralelo
- T021–T030 (placeholders de módulos) son todos paralelos entre sí

---

## Parallel Example: Phase 4 (US2)

```
T021 colaboradores/index.tsx  ─┐
T022 liquidacion/index.tsx    ─┤
T023 bonos/index.tsx          ─┤
T024 notas/index.tsx          ─┼─ ejecutar en paralelo (archivos distintos)
T025 pago-caja/index.tsx      ─┤
T026 configuracion/index.tsx  ─┤
T027 justificaciones/index.tsx─┤
T028 usuarios/index.tsx       ─┤
T029 reportes/index.tsx       ─┤
T030 ingesta/index.tsx        ─┘
```

---

## Implementation Strategy

### MVP First (US1 únicamente)

1. Completar Phase 1 (Setup)
2. Completar Phase 2 (Foundational)
3. Completar Phase 3 (US1) — T012–T019
4. **VALIDAR**: Usuario puede autenticarse y ver Dashboard con sidebar

### Incremental Delivery

1. Phase 1 + 2 → infraestructura lista
2. + Phase 3 (US1) → MVP: autenticación + Dashboard + AppShell
3. + Phase 4 (US2) → todos los módulos con RBAC
4. + Phase 5 (US3) → Vista Home con tarjetas
5. + Phase 6 (US4) → sidebar móvil funcionando
6. + Phase 7 → scripts y validación final

---

## Notes

- `[P]` = archivos distintos, sin dependencias entre sí — paralelos
- `[USN]` = historia de usuario a la que pertenece la tarea
- Los placeholders de módulos (T021–T030) deben exportar `requiredRoles` para el guard de `_app.tsx`
- No se requieren tests automáticos en esta spec; validar manualmente con quickstart.md
- El login en T016 es un stub funcional mínimo — el login completo pertenece a spec 004
