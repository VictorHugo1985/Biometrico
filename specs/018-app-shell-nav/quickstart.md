# Quickstart: App Shell y Navegación Principal

**Branch**: `018-app-shell-nav` | **Date**: 2026-05-20

## Prerrequisitos

- Node 20.x
- Backend corriendo en `http://localhost:3001`
- Variables de entorno del frontend configuradas

## Configuración inicial

```bash
# 1. Crear el workspace del frontend (desde la raíz del monorepo)
mkdir -p apps/frontend

# 2. Instalar dependencias del frontend
cd apps/frontend
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Arrancar el frontend

```bash
# Desde la raíz del monorepo:
npm run frontend:dev

# O desde apps/frontend:
cd apps/frontend && npm run dev
```

Frontend disponible en `http://localhost:3000`

## Flujos de prueba manual

### Flujo 1: Acceso autenticado al Dashboard

1. Navegar a `http://localhost:3000`
2. Si no hay sesión → redirección automática a `/login`
3. Ingresar con usuario administrador
4. Verificar que aterriza en `/dashboard` con el sidebar visible

### Flujo 2: Verificación de RBAC en sidebar

1. Login con usuario rol `caja`
2. Verificar que el sidebar solo muestra "Pago por Caja"
3. Navegar manualmente a `/dashboard` → debe ver página de acceso denegado (403)

### Flujo 3: Sidebar en móvil

1. Abrir DevTools → Toggle Device Toolbar → iPhone SE (375px)
2. Verificar que el sidebar está oculto y hay ícono hamburger en la topbar
3. Tocar hamburger → sidebar abre como drawer
4. Seleccionar un módulo → drawer cierra, navega correctamente

### Flujo 4: Vista Home (índice de módulos)

1. Login como administrador
2. Navegar a `http://localhost:3000/` (ruta raíz)
3. Verificar que se muestran tarjetas para los 11 módulos
4. Hacer clic en cualquier tarjeta → navega a esa sección

## Variables de entorno del frontend

```env
# apps/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001

# No agregar secretos aquí — el frontend solo usa la URL base del API
```

## Scripts del package.json del frontend

```json
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

## Estructura de archivos a crear

```text
apps/frontend/
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.example
└── src/
    ├── middleware.ts                    # Protección de rutas
    ├── pages/
    │   ├── _app.tsx                     # AuthProvider + AppShell condicional
    │   ├── _document.tsx
    │   ├── index.tsx                    # Vista Home (módulos)
    │   ├── 403.tsx
    │   ├── 404.tsx
    │   ├── login.tsx                    # (spec 004)
    │   ├── recuperar-contrasena.tsx     # (spec 004)
    │   ├── dashboard/index.tsx          # placeholder → spec 008
    │   ├── colaboradores/index.tsx      # placeholder → spec 006
    │   ├── liquidacion/index.tsx        # placeholder → spec 007
    │   ├── bonos/index.tsx              # placeholder → spec 010
    │   ├── notas/index.tsx              # placeholder → spec 011
    │   ├── pago-caja/index.tsx          # placeholder → spec 012
    │   ├── configuracion/index.tsx      # placeholder → spec 013
    │   ├── justificaciones/index.tsx    # placeholder → spec 014
    │   ├── usuarios/index.tsx           # placeholder → spec 015
    │   ├── reportes/index.tsx           # placeholder → spec 016
    │   └── ingesta/index.tsx            # placeholder → spec 009
    ├── components/
    │   ├── shell/
    │   │   ├── AppShell.tsx
    │   │   ├── AppSidebar.tsx
    │   │   ├── TopBar.tsx
    │   │   └── ModuleCard.tsx
    │   └── common/
    │       └── AccessDenied.tsx
    ├── config/
    │   └── navigation.ts
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useNavItems.ts
    │   └── useSidebar.ts
    └── providers/
        └── AuthProvider.tsx
```
