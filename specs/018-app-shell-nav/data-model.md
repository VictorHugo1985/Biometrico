# Data Model: App Shell y Navegación Principal

**Branch**: `018-app-shell-nav` | **Date**: 2026-05-20

> Esta feature es puramente frontend; no crea nuevas tablas en base de datos.
> Los modelos aquí son estructuras de datos del cliente (TypeScript types).

---

## NavItem

Representa un ítem de navegación en el sidebar.

```typescript
interface NavItem {
  key: string;           // identificador único (ej: 'dashboard')
  label: string;         // texto visible (ej: 'Dashboard')
  icon: string;          // clase CSS del ícono PrimeIcons (ej: 'pi pi-home')
  href: string;          // ruta Next.js (ej: '/dashboard')
  roles: RolUsuario[];   // roles con acceso; array vacío = todos los roles
}
```

**Derivado de**: `@biometrico/types` → `RolUsuario` enum (`'administrador' | 'supervisor' | 'caja' | 'colaborador'`)

---

## ModuleCard

Representa una tarjeta en la vista Home de índice general.

```typescript
interface ModuleCard {
  key: string;
  label: string;
  description: string;   // descripción breve funcional (1 oración)
  icon: string;
  href: string;
  roles: RolUsuario[];
}
```

---

## AuthState

Estado de autenticación disponible via `useAuth()`.

```typescript
interface AuthState {
  usuario: UsuarioActual | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

interface UsuarioActual {
  id: string;
  correo: string;
  nombre: string;
  rol: RolUsuario;
}
```

**Fuente**: Decodificado del JWT en cookie `biometrico_token`; confirmado con `GET /api/auth/me` (a definir en spec 015 o reusar el payload del login).

---

## SidebarState

Estado local del sidebar (no persistido).

```typescript
interface SidebarState {
  isOpen: boolean;       // solo relevante en viewport móvil
  toggle: () => void;
  close: () => void;
}
```

---

## Relaciones

```
AuthState.usuario.rol
    └── filtra ──> NavItem.roles[]
                     └── renderiza ──> Sidebar items
                                          └── genera ──> ModuleCard items (Home)
```

---

## No se crean tablas de DB

La configuración de navegación es estática en código (`src/config/navigation.ts`).
Los roles de usuario ya existen en `usuarios.rol` (definido en spec 015).
