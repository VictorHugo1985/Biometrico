# Research: Gestión de Pago por Caja

**Feature**: 012-pago-caja | **Date**: 2026-05-20

## Decisión 1: Extensión del schema vs tabla nueva para el estado de pago

**Decision**: Tablas separadas `ajustes_caja` y `confirmaciones_pago` que referencian `resultados_nomina`, sin modificar la tabla existente.

**Rationale**: `resultados_nomina` es el dominio del supervisor; mezclarlo con datos de Caja viola la separación de responsabilidades. Una tabla `confirmaciones_pago` separada preserva la inmutabilidad de la liquidación aprobada (Principio II) y permite auditoría independiente de cada dominio. El estado de pago se deriva de la existencia o no de un registro en `confirmaciones_pago`.

**Alternatives considered**:
- Agregar columnas `fecha_pago`, `cajero_id`, `metodo_pago` a `resultados_nomina`: descartado porque contamina el dominio de nómina con datos de tesorería y dificulta la auditoría separada.
- Tabla única `pagos` con todos los datos consolidados: descartado porque mezcla los ajustes (n por pago) con la confirmación (1 por pago), complicando el modelo.

---

## Decisión 2: Atomicidad de la confirmación de pago

**Decision**: Usar una transacción Supabase (RPC o función PostgreSQL) que en un solo bloque atómico: (a) valida que no exista `confirmaciones_pago` para ese `resultado_nomina_id`, (b) verifica que el `total_final` calculado sea ≥ 0, y (c) inserta el registro de confirmación.

**Rationale**: Evita condiciones de carrera donde dos cajeros podrían confirmar el mismo pago simultáneamente (improbable pero posible en operación con múltiples cajeros). El constraint `UNIQUE` en `confirmaciones_pago.resultado_nomina_id` actúa como salvaguarda de base de datos.

**Alternatives considered**:
- Validar en la capa de servicio TypeScript antes del INSERT: descartado como solución única porque no es atómico; se mantiene como validación de presentación pero la base de datos es el guardián definitivo.

---

## Decisión 3: Rol Caja en el enum `rol_usuario`

**Decision**: `ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'caja'` en una migración separada (`002_pago_caja.sql`). En Supabase/PostgreSQL, `ADD VALUE` en un enum es irreversible dentro de una transacción pero seguro en una migración independiente.

**Rationale**: Supabase no permite hacer `ADD VALUE` dentro de un bloque de transacción DDL. La migración debe ejecutarse fuera de una transacción explícita o en su propio archivo. Al ser una migración aditiva, no rompe datos existentes.

**Alternatives considered**:
- Crear un enum nuevo `rol_caja_usuario` separado: descartado porque `usuarios.rol` es un único campo tipado; duplicar el enum genera inconsistencia en RBAC y rompe las queries existentes de verificación de rol.
- Usar un campo `TEXT` en lugar de enum para el rol: descartado; el schema existente usa el enum y cambiarlo requeriría migración masiva innecesaria.

---

## Decisión 4: Cálculo del total final de Caja

**Decision**: `total_final_caja = resultados_nomina.total_bruto + SUM(ajustes_caja WHERE tipo='incremento' AND anulado=false) - SUM(ajustes_caja WHERE tipo='descuento' AND anulado=false)`. Este cálculo se ejecuta en la capa de servicio y se incluye como columna calculada en la respuesta del API; no se persiste como columna en la base de datos.

**Rationale**: Mantener el cálculo como derivado garantiza que siempre sea consistente con los ajustes vigentes (Principio II). Persistirlo en una columna requeriría triggers o actualizaciones síncronas que añaden complejidad sin beneficio para el volumen esperado (~200 registros).

**Alternatives considered**:
- Columna `total_caja` en `resultados_nomina` actualizada por trigger: descartado por complejidad de trigger y porque viola la separación de dominios (nómina vs pago).
- Vista materializada: descartado por overhead innecesario para el volumen de datos.

---

## Decisión 5: Eliminación de ajustes (anulación vs delete físico)

**Decision**: Los ajustes de Caja se "eliminan" mediante un flag `anulado = true` (soft delete) con campos `anulado_en` y `motivo_anulacion`. No se hace DELETE físico.

**Rationale**: Principio VI exige trazabilidad completa. Si un cajero agrega y luego elimina un ajuste, el historial de esa acción debe ser recuperable. El soft delete preserva el rastro de auditoría sin eliminar el registro.

**Alternatives considered**:
- Tabla de auditoría separada para registrar deletes: descartado por complejidad adicional cuando el soft delete logra el mismo objetivo con menor overhead.
- DELETE físico + insert en tabla de auditoría: descartado por ser más complejo y propenso a inconsistencias si la inserción de auditoría falla.

---

## Decisión 6: Métodos de pago

**Decision**: Campo `metodo_pago TEXT NOT NULL DEFAULT 'efectivo'` en `confirmaciones_pago`. Los valores aceptados se validan en la capa de servicio contra una lista configurable almacenada como configuración de aplicación (no una tabla adicional en v1).

**Rationale**: En v1 el método dominante es efectivo; agregar una tabla `metodos_pago` para 1-3 opciones es sobreingeniería. Si la lista crece, se migra a tabla en v2.

**Alternatives considered**:
- Enum PostgreSQL para métodos de pago: descartado porque agregar valores a un enum requiere migración DDL; una lista en configuración es más flexible.
- Tabla `metodos_pago` configurable: válido pero excesivo para v1.
