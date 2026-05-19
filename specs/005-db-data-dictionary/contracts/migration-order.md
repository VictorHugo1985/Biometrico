# Contrato de Orden de Migración

**Feature**: `005-db-data-dictionary`
**Date**: 2026-05-18

Este documento define el orden obligatorio de creación de tablas en la base de datos, derivado del grafo de dependencias FK del diccionario de datos.

---

## Secuencia de Migraciones

Las migraciones DEBEN ejecutarse en el orden de waves. Dentro de cada wave, el orden es flexible.

### Wave 1 — Sin dependencias FK externas

| # | Tabla | Notas |
|---|-------|-------|
| 1 | `tipos_verificacion` | + INSERT seed con los 9 códigos CrossChex |
| 2 | `usuarios` | Self-ref `creado_por` con `DEFERRABLE INITIALLY DEFERRED` |
| 3 | `departamentos` | Self-ref `padre_id` con `DEFERRABLE INITIALLY DEFERRED` |
| 4 | `tokens_api_externa` | Sin FK externas |

### Wave 2 — Depende de Wave 1

| # | Tabla | Dependencias |
|---|-------|-------------|
| 5 | `dispositivos_biometricos` | Sin FK (puede estar en Wave 1) |
| 6 | `colaboradores` | `departamentos`, `usuarios` |
| 7 | `sesiones_usuario` | `usuarios` |
| 8 | `tokens_recuperacion` | `usuarios` |
| 9 | `intentos_login` | `usuarios` |
| 10 | `plantillas_horario` | `usuarios` |
| 11 | `reglas_nomina` | `usuarios` |
| 12 | `periodos_semanales` | `usuarios` |
| 13 | `registros_aprobacion` | `usuarios` (referencia polimórfica no-FK) |

### Wave 3 — Depende de Wave 2

| # | Tabla | Dependencias |
|---|-------|-------------|
| 14 | `asignaciones_horario` | `plantillas_horario`, `colaboradores`, `departamentos`, `usuarios` |
| 15 | `asignaciones_regla_nomina` | `reglas_nomina`, `colaboradores`, `departamentos`, `usuarios` |
| 16 | `eventos_biometricos` †| `colaboradores`, `dispositivos_biometricos`, `tipos_verificacion` |
| 17 | `resultados_nomina` | `periodos_semanales`, `colaboradores`, `reglas_nomina`, `usuarios` |

`†` Incluye la creación del trigger append-only inmediatamente después de `CREATE TABLE`.

### Wave 4 — Depende de Wave 3

| # | Tabla | Dependencias |
|---|-------|-------------|
| 18 | `ajustes_biometricos` | `eventos_biometricos`, `colaboradores`, `periodos_semanales`, `usuarios` |
| 19 | `auditoria_webhooks` | `eventos_biometricos` |
| 20 | `justificaciones` | `colaboradores`, `periodos_semanales`, `usuarios` |

### Wave 5 — Depende de Wave 4

| # | Tabla | Dependencias |
|---|-------|-------------|
| 21 | `lineas_resultado_nomina` | `resultados_nomina`, `eventos_biometricos`, `ajustes_biometricos` |

---

## Objetos de Base de Datos Adicionales (Post-Tablas)

Después de crear todas las tablas, deben crearse:

| Objeto | Tipo | Tabla objetivo |
|--------|------|----------------|
| `fn_bloquear_mutacion_eventos` + trigger | Función + Trigger | `eventos_biometricos` |
| `fn_actualizar_timestamp` + triggers | Función + Triggers | Todas las tablas con `actualizado_en` |
| Índices adicionales | Índices BTREE | Ver `research.md` §4 |
| CHECK XOR asignaciones | CHECK constraint | `asignaciones_horario`, `asignaciones_regla_nomina` |
| CHECK inicio_periodo=lunes | CHECK constraint | `periodos_semanales` |

---

## Reglas del Contrato de Migración

1. **Cada migración es reversible**: todo script de migración DEBE incluir una sección `-- DOWN` que revierta los cambios.
2. **Atomic**: cada wave de migración se ejecuta en una transacción; si falla alguna tabla, la wave completa hace rollback.
3. **Idempotencia**: los scripts DEBEN usar `CREATE TABLE IF NOT EXISTS` y `CREATE INDEX IF NOT EXISTS`.
4. **Seed separado del schema**: el seed de `tipos_verificacion` es parte de la migración inicial de esa tabla (no de un script seed independiente), garantizando que los valores estén presentes antes de los primeros eventos.
5. **Modificaciones futuras**: cualquier `ALTER TABLE` (añadir columna, modificar tipo) requiere actualizar primero el diccionario de datos (`spec.md`) y luego generar la migración correspondiente. El spec es el contrato; la migración es la consecuencia.

---

## Estructura de Archivos de Migración (Supabase CLI)

```
supabase/
  migrations/
    [timestamp]_001_tipos_verificacion.sql
    [timestamp]_002_usuarios.sql
    [timestamp]_003_departamentos.sql
    [timestamp]_004_tokens_api_externa.sql
    [timestamp]_005_dispositivos_biometricos.sql
    [timestamp]_006_colaboradores.sql
    [timestamp]_007_sesiones_usuario.sql
    [timestamp]_008_tokens_recuperacion.sql
    [timestamp]_009_intentos_login.sql
    [timestamp]_010_plantillas_horario.sql
    [timestamp]_011_reglas_nomina.sql
    [timestamp]_012_periodos_semanales.sql
    [timestamp]_013_registros_aprobacion.sql
    [timestamp]_014_asignaciones_horario.sql
    [timestamp]_015_asignaciones_regla_nomina.sql
    [timestamp]_016_eventos_biometricos.sql    ← incluye trigger append-only
    [timestamp]_017_resultados_nomina.sql
    [timestamp]_018_ajustes_biometricos.sql
    [timestamp]_019_auditoria_webhooks.sql
    [timestamp]_020_justificaciones.sql
    [timestamp]_021_lineas_resultado_nomina.sql
    [timestamp]_022_triggers_actualizado_en.sql
    [timestamp]_023_indices_adicionales.sql
```
