# Research: App Shell y Navegación Principal

**Branch**: `018-app-shell-nav` | **Date**: 2026-05-20

## Decision 1: Next.js Router Strategy — Pages Router

**Decision**: Usar Next.js 14 con **Pages Router** (`pages/` directory), no App Router.

**Rationale**: Los planes de las specs 004 y 008 ya establecen `pages/` como estructura del frontend (`pages/login.tsx`, `pages/dashboard/index.tsx`). Cambiar a App Router rompería la consistencia con esas specs y requeriría re-plantear todos los layouts futuros.

**Alternatives considered**:
- App Router (Next.js 13+): más moderno, Server Components, layouts anidados nativos. Rechazado por inconsistencia con specs ya planificadas.

---

## Decision 2: Layout con `_app.tsx` y HOC de autenticación

**Decision**: El app shell se implementa en `apps/frontend/src/pages/_app.tsx` con un HOC `withAppShell` que envuelve todas las páginas autenticadas. Las páginas públicas (`/login`, `/recuperar-contrasena`) omiten el shell.

**Rationale**: Con Pages Router el punto de composición de layouts es `_app.tsx`. El patrón HOC es compatible con PrimeReact y permite que cada página declare si necesita el shell o no.

**Alternatives considered**:
- Layout por página (cada `getLayout`): más flexible pero más verboso; rechazado por ser innecesariamente complejo para esta escala (Principio IX).
- App Router layouts anidados: rechazado (Decision 1).

---

## Decision 3: UI Library — PrimeReact 10.x con PrimeFlex

**Decision**: PrimeReact 10.x para componentes de UI; PrimeFlex para grid y utilidades de layout. Sin Tailwind CSS.

**Rationale**: PrimeReact ya está definido en spec 004. PrimeFlex es la biblioteca de utilidades CSS compañera de PrimeReact, evitando conflictos de estilos con una segunda biblioteca.

**Components seleccionados**:
- `<PanelMenu>`: menú colapsable para el sidebar en escritorio
- `<Drawer>` (PrimeReact 10 reemplaza `<Sidebar>` para overlays): drawer lateral en móvil
- `<Toolbar>`: barra superior en móvil con botón hamburger
- `<Card>`: tarjetas de módulo en la vista Home

**Alternatives considered**:
- Tailwind CSS: rechazado para evitar conflictos con estilos de PrimeReact; PrimeFlex cubre las necesidades de layout.
- shadcn/ui: rechazado por inconsistencia con PrimeReact ya definido.

---

## Decision 4: Protección de rutas — middleware.ts de Next.js

**Decision**: Usar `apps/frontend/src/middleware.ts` de Next.js para redirigir a `/login` si no hay token JWT en la cookie. La verificación completa de rol se hace client-side en el hook `useAuth`.

**Rationale**: El middleware de Next.js corre en el Edge Runtime antes de que la página se sirva, evitando flashes de contenido no autorizado (FOUC). La verificación de rol a nivel de página es suficiente dado que los datos sensibles siempre están protegidos en el backend por RBAC.

**Alternatives considered**:
- Solo verificación client-side: produce flash de la página antes de redirigir. Rechazado por UX.
- JWT verification completa en middleware Edge: requiere `jose` para verificar JWT en Edge Runtime; añade complejidad. Aceptable como mejora futura.

---

## Decision 5: Estado del sidebar — React Context local

**Decision**: El estado abierto/cerrado del sidebar móvil se maneja con `useState` en `AppShell.tsx`, no en Context global.

**Rationale**: El estado del sidebar es local a la sesión del layout; no necesita ser consumido por componentes hijos. Mantenerlo local sigue el Principio IX de simplicidad.

---

## Decision 6: Configuración de navegación — archivo estático

**Decision**: Los módulos del sistema se definen en `src/config/navigation.ts` como un array de objetos con `label`, `icon`, `href`, y `roles: RolUsuario[]`. El sidebar filtra por el rol del usuario actual.

**Rationale**: La lista de módulos es estática (no cambia en runtime); no requiere una API. Centralizar en un archivo de configuración facilita agregar módulos futuros en un solo lugar.

**Modules definidos** (basados en specs 006–016):

| Key | Label | Ruta | Roles permitidos |
|-----|-------|------|-----------------|
| dashboard | Dashboard | /dashboard | administrador, supervisor |
| colaboradores | Colaboradores | /colaboradores | administrador, supervisor |
| liquidacion | Liquidación Semanal | /liquidacion | administrador |
| bonos | Bonos Diarios | /bonos | administrador, supervisor |
| notas | Notas de Registro | /notas | administrador, supervisor |
| pago-caja | Pago por Caja | /pago-caja | administrador, caja |
| configuracion | Configuración | /configuracion | administrador |
| justificaciones | Justificaciones | /justificaciones | administrador, supervisor |
| usuarios | Gestión de Usuarios | /usuarios | administrador |
| reportes | Reportes | /reportes | administrador, supervisor |
| ingesta | Ingesta Biométrica | /ingesta | administrador |

---

## Decision 7: Token de sesión — cookie con fallback localStorage

**Decision**: El JWT se lee de la cookie `biometrico_token` (HttpOnly en producción); en desarrollo se acepta también `localStorage`. Esto ya está definido en spec 004.

**Rationale**: La cookie HttpOnly protege contra XSS. `useAuth` encapsula la lectura para que el resto de la app no accedan directamente al storage.
