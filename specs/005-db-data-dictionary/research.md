# Research: Diccionario de Datos Relacional

**Phase**: 0 — Resolución de incógnitas técnicas
**Feature**: `005-db-data-dictionary`
**Date**: 2026-05-18

---

## 1. Mapeo de Tipos Vendor-Neutral → PostgreSQL (Supabase)

| Tipo del contrato | Tipo PostgreSQL | Notas |
|-------------------|----------------|-------|
| `uuid` | `UUID` | `gen_random_uuid()` disponible desde PG 13 (nativo en Supabase) |
| `texto` | `TEXT` | Sin límite de longitud; usar `VARCHAR(n)` solo si hay restricción de dominio explícita |
| `entero` | `INTEGER` | 4 bytes; suficiente para todos los enteros del dominio |
| `numerico(p,s)` | `NUMERIC(p,s)` | Alias `DECIMAL(p,s)` equivalente; obligatorio para dinero |
| `booleano` | `BOOLEAN` | |
| `timestamp_tz` | `TIMESTAMPTZ` | Almacena en UTC; convierte a la zona del cliente al leer |
| `fecha` | `DATE` | Sin componente de hora |
| `hora` | `TIME` | Sin zona horaria; la zona queda implícita por las políticas de negocio |
| `jsonb` | `JSONB` | Binario indexable; preferible a `JSON` para consultas |
| `entero[]` | `INTEGER[]` | Array nativo PostgreSQL |
| `enum(...)` | `TEXT` + `CHECK` o `CREATE TYPE ... AS ENUM` | Se recomienda `CREATE TYPE` para legibilidad; permite futuras extensiones con `ALTER TYPE ... ADD VALUE` |

**Decisión**: Usar `CREATE TYPE ... AS ENUM` para todos los campos `enum` del contrato.  
**Rationale**: Los `ENUM` tipados de PostgreSQL son detectados por los ORM (Prisma, TypeORM) y generan tipos TypeScript directamente.  
**Alternativa rechazada**: `TEXT + CHECK CONSTRAINT` — no genera tipos automáticamente y pierde la semántica de dominio.

---

## 2. Generación de UUID

**Decisión**: `gen_random_uuid()` como default de todas las PKs UUID.  
**Rationale**: Función nativa de PostgreSQL 13+ (habilitada por defecto en Supabase). No requiere extensión `uuid-ossp`.  
**Alternativa rechazada**: `uuid_generate_v4()` (requiere `CREATE EXTENSION uuid-ossp`; añade fricción en entornos nuevos).

---

## 3. Aplicación de Append-Only en `eventos_biometricos`

**Decisión**: Trigger `BEFORE UPDATE OR DELETE` que lanza `RAISE EXCEPTION` en la tabla `eventos_biometricos`.  
**Rationale**: La restricción a nivel de base de datos es la única garantía que no puede ser ignorada por la capa de aplicación. Una política RLS de Supabase puede complementarla pero no reemplazarla.

```sql
-- Patrón de implementación (referencia)
CREATE OR REPLACE FUNCTION fn_bloquear_mutacion_eventos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'eventos_biometricos es append-only; no se permiten UPDATE ni DELETE (Principio I)';
END;
$$;

CREATE TRIGGER trg_bloquear_mutacion_eventos
BEFORE UPDATE OR DELETE ON eventos_biometricos
FOR EACH ROW EXECUTE FUNCTION fn_bloquear_mutacion_eventos();
```

**Alternativa rechazada**: Solo restricción a nivel de aplicación — violable por acceso directo a BD o bugs en capas de servicio.

---

## 4. Estrategia de Índices

Los índices mínimos requeridos, más allá de los PK y UQ implícitos:

| Tabla | Columna(s) | Tipo | Justificación |
|-------|-----------|------|---------------|
| `eventos_biometricos` | `colaborador_id, hora_marcacion` | BTREE | Query principal: historial de marcaciones por colaborador en rango de fechas |
| `eventos_biometricos` | `hora_marcacion` | BTREE | Queries de ventana temporal (webhook latency, dashboard) |
| `sesiones_usuario` | `hash_token` | BTREE | Lookup en cada request autenticado (ya UQ, automático) |
| `sesiones_usuario` | `usuario_id, estado` | BTREE | Invalidar todas las sesiones activas de un usuario |
| `tokens_recuperacion` | `hash_token` | BTREE | Lookup por token de recuperación (ya UQ, automático) |
| `resultados_nomina` | `(periodo_id, colaborador_id)` | BTREE | Ya UNIQUE; índice automático |
| `auditoria_webhooks` | `id_solicitud_crosschex` | BTREE | Detección rápida de duplicados por requestId |
| `ajustes_biometricos` | `colaborador_id, estado` | BTREE | Listar ajustes pendientes de aprobación por colaborador |
| `intentos_login` | `correo_intentado, intentado_en` | BTREE | Consultas de auditoría por correo en rango de tiempo |

---

## 5. Formato de Migraciones (Supabase)

**Decisión**: Migraciones SQL numeradas en `supabase/migrations/`, una por tabla o agrupadas por dominio.  
**Rationale**: Supabase CLI (`supabase db push`, `supabase migration new`) usa este formato estándar; permite aplicación local y remota sin cambios.  
**Naming convention**: `NNNNNNNNNNNNNN_descripcion.sql` (timestamp Unix ms, generado por `supabase migration new`).  
**Alternativa rechazada**: ORM-native migrations (Prisma `migrate dev`) — añade dependencia de Prisma al proceso de migración cuando el proyecto usa TypeORM o acceso directo.

---

## 6. Restricción XOR en `asignaciones_horario` y `asignaciones_regla_nomina`

La constraint "exactamente uno de `colaborador_id` o `departamento_id` no nulo" se implementa con CHECK:

```sql
CONSTRAINT chk_xor_asignacion CHECK (
  (colaborador_id IS NOT NULL AND departamento_id IS NULL) OR
  (colaborador_id IS NULL AND departamento_id IS NOT NULL)
)
```

**Decisión**: CHECK constraint a nivel de tabla.  
**Rationale**: Garantía a nivel DB; no requiere lógica en capa de aplicación.

---

## 7. Seed de `tipos_verificacion`

Esta tabla es de referencia inmutable con valores del proveedor CrossChex. Se popula una sola vez con datos de seed, no con migración mutable.

**Decisión**: Incluir el seed de `tipos_verificacion` como parte de la migración inicial de la tabla (INSERT dentro del script de migración).  
**Rationale**: Los valores son conocidos, fijos, y deben estar presentes antes de que llegue cualquier evento biométrico.

---

## 8. `actualizado_en` con Trigger Automático

El campo `actualizado_en` debe actualizarse automáticamente en cada UPDATE. PostgreSQL no tiene `ON UPDATE CURRENT_TIMESTAMP` como MySQL; se requiere un trigger.

**Decisión**: Trigger genérico reutilizable `fn_actualizar_timestamp()` aplicado a todas las tablas mutables.

```sql
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;
```

Se aplica con:
```sql
CREATE TRIGGER trg_actualizar_[tabla]
BEFORE UPDATE ON [tabla]
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp();
```

---

## 9. Paquete Compartido de Tipos TypeScript (`packages/database`)

**Decisión**: Crear `packages/database` en el monorepo con tipos TypeScript manuales (o generados desde schema) que representen las 21 tablas.  
**Rationale**: Permite que `apps/backend` (Nest.js) y `apps/frontend` (Next.js) compartan interfaces sin duplicación.  
**Alternativa considerada**: Generar tipos desde Supabase CLI (`supabase gen types typescript`) — válida y complementaria; puede adoptarse en fase de implementación.

---

## Resumen de Decisiones

| # | Área | Decisión |
|---|------|----------|
| 1 | Tipos | Mapeo vendor-neutral → PostgreSQL documentado |
| 2 | UUID | `gen_random_uuid()` como default |
| 3 | Append-only | Trigger `BEFORE UPDATE OR DELETE` en `eventos_biometricos` |
| 4 | Índices | 9 índices adicionales identificados |
| 5 | Migraciones | SQL en `supabase/migrations/` con Supabase CLI |
| 6 | XOR constraint | `CHECK` constraint en tabla para `asignaciones_*` |
| 7 | Seed | `tipos_verificacion` seed incluido en migración inicial |
| 8 | `actualizado_en` | Trigger genérico reutilizable |
| 9 | TypeScript | `packages/database` con tipos compartidos |
