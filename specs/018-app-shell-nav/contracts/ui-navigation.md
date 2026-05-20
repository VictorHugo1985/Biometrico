# Contrato UI: App Shell y Navegación

**Branch**: `018-app-shell-nav` | **Date**: 2026-05-20

---

## Componentes públicos exportados

### `<AppShell>`

Layout wrapper para todas las páginas autenticadas.

```tsx
interface AppShellProps {
  children: React.ReactNode;
}

// Uso en _app.tsx:
// <AppShell><Component {...pageProps} /></AppShell>
```

**Garantías**:
- Redirige a `/login` si no hay sesión activa
- Renderiza sidebar + topbar + área de contenido
- Sidebar siempre visible en viewport ≥ 768 px
- Sidebar como drawer en viewport < 768 px

---

### `useAuth()`

Hook de contexto de autenticación.

```typescript
function useAuth(): AuthState

// Ejemplo:
const { usuario, isAuthenticated, logout } = useAuth();
```

**Garantías**:
- `usuario` es null mientras `isLoading === true`
- `logout()` invalida la cookie y redirige a `/login`
- Disponible en cualquier componente dentro de `<AuthProvider>`

---

### `useNavItems()`

Hook que retorna los ítems de navegación filtrados por el rol del usuario actual.

```typescript
function useNavItems(): NavItem[]

// Ejemplo:
const items = useNavItems();
// Para rol 'caja': retorna solo [{ key: 'pago-caja', ... }]
```

**Garantías**:
- Retorna array vacío mientras `isLoading === true`
- Nunca retorna ítems fuera del rol del usuario autenticado

---

## Rutas de la aplicación

### Rutas públicas (sin AppShell)

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/login` | `pages/login.tsx` | Formulario de inicio de sesión |
| `/recuperar-contrasena` | `pages/recuperar-contrasena.tsx` | Solicitud y confirmación de reset |
| `/403` | `pages/403.tsx` | Acceso denegado |
| `/404` | `pages/404.tsx` | Página no encontrada |

### Rutas autenticadas (con AppShell)

| Ruta | Componente | Roles | Spec |
|------|-----------|-------|------|
| `/` | `pages/index.tsx` | todos | 018 |
| `/dashboard` | `pages/dashboard/index.tsx` | administrador, supervisor | 008 |
| `/colaboradores` | `pages/colaboradores/index.tsx` | administrador, supervisor | 006 |
| `/liquidacion` | `pages/liquidacion/index.tsx` | administrador | 007 |
| `/bonos` | `pages/bonos/index.tsx` | administrador, supervisor | 010 |
| `/notas` | `pages/notas/index.tsx` | administrador, supervisor | 011 |
| `/pago-caja` | `pages/pago-caja/index.tsx` | administrador, caja | 012 |
| `/configuracion` | `pages/configuracion/index.tsx` | administrador | 013 |
| `/justificaciones` | `pages/justificaciones/index.tsx` | administrador, supervisor | 014 |
| `/usuarios` | `pages/usuarios/index.tsx` | administrador | 015 |
| `/reportes` | `pages/reportes/index.tsx` | administrador, supervisor | 016 |
| `/ingesta` | `pages/ingesta/index.tsx` | administrador | 009 |

---

## Middleware de protección

**Archivo**: `apps/frontend/src/middleware.ts`

**Lógica**:
1. Si la ruta está en `PUBLIC_ROUTES` → dejar pasar
2. Si no hay cookie `biometrico_token` → redirigir a `/login?redirect=<ruta-original>`
3. Si hay cookie → dejar pasar (validación completa en `useAuth`)

```typescript
// PUBLIC_ROUTES
const PUBLIC_ROUTES = ['/login', '/recuperar-contrasena', '/403', '/404'];
```

---

## Configuración de navegación (navigation.ts)

```typescript
// src/config/navigation.ts
export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',       label: 'Dashboard',            icon: 'pi pi-chart-bar',    href: '/dashboard',     roles: ['administrador', 'supervisor'] },
  { key: 'colaboradores',   label: 'Colaboradores',        icon: 'pi pi-users',        href: '/colaboradores', roles: ['administrador', 'supervisor'] },
  { key: 'liquidacion',     label: 'Liquidación Semanal',  icon: 'pi pi-calculator',   href: '/liquidacion',   roles: ['administrador'] },
  { key: 'bonos',           label: 'Bonos Diarios',        icon: 'pi pi-star',         href: '/bonos',         roles: ['administrador', 'supervisor'] },
  { key: 'notas',           label: 'Notas de Registro',    icon: 'pi pi-file-edit',    href: '/notas',         roles: ['administrador', 'supervisor'] },
  { key: 'pago-caja',       label: 'Pago por Caja',        icon: 'pi pi-wallet',       href: '/pago-caja',     roles: ['administrador', 'caja'] },
  { key: 'configuracion',   label: 'Configuración',        icon: 'pi pi-cog',          href: '/configuracion', roles: ['administrador'] },
  { key: 'justificaciones', label: 'Justificaciones',      icon: 'pi pi-shield',       href: '/justificaciones', roles: ['administrador', 'supervisor'] },
  { key: 'usuarios',        label: 'Gestión de Usuarios',  icon: 'pi pi-user-plus',    href: '/usuarios',      roles: ['administrador'] },
  { key: 'reportes',        label: 'Reportes',             icon: 'pi pi-download',     href: '/reportes',      roles: ['administrador', 'supervisor'] },
  { key: 'ingesta',         label: 'Ingesta Biométrica',   icon: 'pi pi-sync',         href: '/ingesta',       roles: ['administrador'] },
];

export const MODULE_DESCRIPTIONS: Record<string, string> = {
  dashboard:       'Estado de asistencia en tiempo real por área.',
  colaboradores:   'Registro y gestión del personal activo.',
  liquidacion:     'Cálculo y cierre de nómina semanal.',
  bonos:           'Confirmación de bonos de transporte y alimentación.',
  notas:           'Notas y adjuntos sobre registros biométricos.',
  'pago-caja':     'Consolidados de pago y confirmación de cobros.',
  configuracion:   'Horarios, tarifas y reglas de negocio configurables.',
  justificaciones: 'Aprobación de ausencias y ajustes manuales.',
  usuarios:        'Cuentas de usuario del sistema y asignación de roles.',
  reportes:        'Exportación de datos de nómina y asistencia.',
  ingesta:         'Sincronización manual de registros desde CrossChex.',
};
```
