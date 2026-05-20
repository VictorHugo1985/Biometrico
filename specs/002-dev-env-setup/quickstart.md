# Quickstart: Configurar el Entorno de Desarrollo

## Prerrequisitos del sistema

```bash
node --version   # v20.x o superior
pnpm --version   # v9.x o superior
docker --version # Docker Desktop corriendo
supabase --version # Supabase CLI
```

Si falta alguno: `bash scripts/check-env.sh` mostrará qué instalar y cómo.

## Primera vez

```bash
# 1. Clonar el repo
git clone <repo-url>
cd Biometrico

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Editar cada .env con los valores locales

# 4. Levantar base de datos local
supabase start
# → Dashboard en http://localhost:54323

# 5. Aplicar migraciones
supabase db push

# 6. Arrancar apps en modo desarrollo
turbo dev
# → Backend en http://localhost:3001
# → Frontend en http://localhost:3000
```

## Verificación

```bash
turbo typecheck   # Debe completar sin errores
turbo test        # Debe pasar todos los tests
```
