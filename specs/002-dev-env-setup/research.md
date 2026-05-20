# Research: Entorno de Desarrollo

## 1. Gestor de paquetes y workspaces

**Decision**: pnpm 9.x con `pnpm-workspace.yaml`

**Rationale**: pnpm es más eficiente en disco que npm/yarn (symlinks vs. copias). Turborepo tiene soporte nativo para pnpm workspaces. El comando `pnpm install` desde la raíz instala todas las dependencias de todos los paquetes y resuelve los `workspace:*` localmente.

## 2. Orquestador de monorepo

**Decision**: Turborepo con `turbo.json` en la raíz

**Rationale**: Caché de outputs, ejecución paralela de tasks, grafos de dependencia entre paquetes. Pipeline mínimo: `build`, `typecheck`, `test`, `lint`, `dev`.

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

## 3. Base de datos local

**Decision**: Supabase CLI con `supabase start` (Docker)

**Rationale**: Replica el entorno de producción (PostgreSQL 17, auth, storage). Las migraciones de `supabase/migrations/` se aplican automáticamente al iniciar. El dashboard local en `localhost:54323`.

**Prerrequisito**: Docker Desktop instalado y corriendo.

## 4. Variables de entorno

**Decision**: `.env.example` en raíz y en cada app; `.env` ignorado por git

**Pattern**:
```
# apps/backend/.env.example
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_SERVICE_ROLE_KEY=...
WEBHOOK_SECRET=...
JWT_SECRET=...

# apps/frontend/.env.example
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
```

## 5. Linting y formato

**Decision**: ESLint 8.x + Prettier 3.x + Husky pre-commit

**Config compartida** en raíz; cada app/package extiende. `lint-staged` aplica solo a archivos modificados en el commit para no ralentizar el flujo.

## 6. Comandos clave

```bash
pnpm install              # instalar todas las dependencias
supabase start            # levantar DB local
turbo dev                 # arrancar backend + frontend en paralelo
turbo build               # build completo (packages → apps)
turbo typecheck           # verificar tipos en todo el workspace
turbo test                # tests unitarios
turbo lint                # linting
```
