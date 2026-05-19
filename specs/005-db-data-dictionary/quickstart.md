# Quickstart: Implementar el Diccionario de Datos

**Feature**: `005-db-data-dictionary`
**Date**: 2026-05-18

---

## Prerequisitos

- Supabase CLI instalado: `brew install supabase/tap/supabase`
- Docker Desktop corriendo (para Supabase local)
- Repo clonado y dependencias instaladas (`pnpm install` en raíz del monorepo)

---

## 1. Iniciar Supabase Local

```bash
supabase start
```

Esto levanta PostgreSQL, Auth, Storage y Studio localmente. El dashboard local está en `http://localhost:54323`.

---

## 2. Crear Archivos de Migración

Para cada tabla del diccionario, crea un archivo de migración en orden de wave:

```bash
supabase migration new 001_tipos_verificacion
supabase migration new 002_usuarios
# ... (una por tabla, siguiendo el orden de contracts/migration-order.md)
```

Cada archivo generado en `supabase/migrations/` debe implementar la tabla según su definición en `spec.md`.

---

## 3. Aplicar Migraciones Localmente

```bash
supabase db reset
```

Esto aplica todas las migraciones desde cero. Si falla alguna migración, el error indica la tabla y el problema.

---

## 4. Verificar el Schema

Después de `db reset`, verificar que las 21 tablas existen:

```bash
supabase db diff --schema public
```

O consultar directamente:

```sql
-- En psql o Supabase Studio SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Resultado esperado: 21 tablas
```

---

## 5. Verificar Restricciones Críticas

### Append-only en `eventos_biometricos`

```sql
-- Debe fallar con RAISE EXCEPTION
INSERT INTO eventos_biometricos (id, id_solicitud_externo, colaborador_id, dispositivo_id,
  codigo_tipo_verificacion, hora_marcacion, origen, recibido_en)
VALUES (gen_random_uuid(), 'test-001', ..., 'webhook', NOW());

-- Intentar UPDATE (debe lanzar excepción):
UPDATE eventos_biometricos SET origen = 'sincronizacion_api' WHERE id = '...';
-- Expected: ERROR: eventos_biometricos es append-only
```

### XOR en `asignaciones_horario`

```sql
-- Debe fallar (ambos nulos):
INSERT INTO asignaciones_horario (plantilla_horario_id, vigente_desde)
VALUES ('...', '2026-01-01');
-- Expected: ERROR: violates check constraint "chk_xor_asignacion"

-- Debe fallar (ambos no nulos):
INSERT INTO asignaciones_horario (plantilla_horario_id, colaborador_id, departamento_id, vigente_desde)
VALUES ('...', '...', '...', '2026-01-01');
-- Expected: ERROR: violates check constraint "chk_xor_asignacion"
```

### Seed de `tipos_verificacion`

```sql
SELECT COUNT(*) FROM tipos_verificacion;
-- Expected: 9
```

---

## 6. Generar Tipos TypeScript (opcional pero recomendado)

Supabase CLI puede generar tipos TypeScript desde el schema:

```bash
supabase gen types typescript --local > packages/database/src/database.types.ts
```

Esto crea tipos para todas las 21 tablas, sus columnas y enums, listos para importar en `apps/backend` y `apps/frontend`.

---

## 7. Aplicar en Supabase Remoto (Producción/Staging)

```bash
supabase db push
```

Aplica las migraciones pendientes al proyecto Supabase remoto configurado en `supabase/config.toml`.

---

## Referencia de Archivos

| Archivo | Propósito |
|---------|-----------|
| `spec.md` | Contrato de datos — fuente de verdad |
| `research.md` | Mapeo de tipos y decisiones técnicas |
| `data-model.md` | Grafo de dependencias y relaciones |
| `contracts/migration-order.md` | Orden de creación de tablas |
| `supabase/migrations/` | Scripts SQL de migración (a crear) |
| `packages/database/src/` | Tipos TypeScript generados (a crear) |
