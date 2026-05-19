# Data Model: Diccionario de Datos Relacional

**Phase**: 1 — Diseño y Contratos
**Feature**: `005-db-data-dictionary`
**Date**: 2026-05-18

---

## Resumen del Modelo

21 tablas en 7 dominios. El modelo es **single-tenant**; no existe columna de aislamiento multi-empresa.

---

## Mapa de Dependencias FK

Las flechas representan FK. Una tabla puede crearse solo cuando sus dependencias existen.

```
WAVE 1 (sin dependencias FK externas)
─────────────────────────────────────
tipos_verificacion
usuarios ────────────────┐ (self-ref: creado_por → usuarios.id, nullable)
departamentos ───────────┘ (self-ref: padre_id → departamentos.id, nullable)
tokens_api_externa

WAVE 2 (depende de Wave 1)
──────────────────────────
colaboradores           → departamentos, usuarios
dispositivos_biometricos (sin FK)
sesiones_usuario        → usuarios
tokens_recuperacion     → usuarios
intentos_login          → usuarios
plantillas_horario      → usuarios
reglas_nomina           → usuarios
periodos_semanales      → usuarios
registros_aprobacion    → usuarios (referencia polimórfica no-FK a ajustes/justificaciones)

WAVE 3 (depende de Wave 2)
──────────────────────────
asignaciones_horario          → plantillas_horario, colaboradores, departamentos, usuarios
asignaciones_regla_nomina     → reglas_nomina, colaboradores, departamentos, usuarios
eventos_biometricos [†]       → colaboradores, dispositivos_biometricos, tipos_verificacion
resultados_nomina             → periodos_semanales, colaboradores, reglas_nomina, usuarios

WAVE 4 (depende de Wave 3)
──────────────────────────
ajustes_biometricos           → eventos_biometricos, colaboradores, periodos_semanales, usuarios
auditoria_webhooks            → eventos_biometricos (nullable)
justificaciones               → colaboradores, periodos_semanales, usuarios

WAVE 5 (depende de Wave 4)
──────────────────────────
lineas_resultado_nomina       → resultados_nomina, eventos_biometricos (nullable), ajustes_biometricos (nullable)
```

`†` = append-only; trigger bloquea UPDATE y DELETE.

---

## Diagrama de Relaciones por Dominio

### Dominio 1: Identidad y Acceso

```
usuarios
  ├── sesiones_usuario (N) [usuario_id]
  ├── tokens_recuperacion (N) [usuario_id]
  ├── intentos_login (N) [usuario_id, nullable]
  └── colaboradores (0..1) [colaborador_id ← back-ref]

usuarios.creado_por → usuarios (self-ref)
```

### Dominio 2: Organización

```
departamentos
  ├── padre_id → departamentos (jerarquía)
  └── colaboradores (N) [departamento_id]

colaboradores
  ├── usuario_id ← usuarios (vínculo opcional)
  ├── departamento_id → departamentos
  ├── eventos_biometricos (N) [colaborador_id]
  ├── ajustes_biometricos (N) [colaborador_id]
  ├── resultados_nomina (N) [colaborador_id]
  └── justificaciones (N) [colaborador_id]
```

### Dominio 3: Biométrico

```
dispositivos_biometricos
  └── eventos_biometricos (N) [dispositivo_id]

tipos_verificacion
  └── eventos_biometricos (N) [codigo_tipo_verificacion]

eventos_biometricos [append-only]
  ├── ajustes_biometricos (N) [evento_original_id, nullable]
  ├── auditoria_webhooks (0..1) [evento_biometrico_id, nullable]
  └── lineas_resultado_nomina (N) [evento_biometrico_id, nullable]
```

### Dominio 4: Reglas de Negocio

```
plantillas_horario
  └── asignaciones_horario (N) [plantilla_horario_id]
      ├── colaborador_id → colaboradores (nullable, XOR)
      └── departamento_id → departamentos (nullable, XOR)

reglas_nomina
  ├── asignaciones_regla_nomina (N) [regla_nomina_id]
  │   ├── colaborador_id → colaboradores (nullable, XOR)
  │   └── departamento_id → departamentos (nullable, XOR)
  └── resultados_nomina (N) [regla_nomina_id]
```

### Dominio 5: Nómina

```
periodos_semanales
  ├── ajustes_biometricos (N) [periodo_id]
  ├── justificaciones (N) [periodo_id]
  └── resultados_nomina (N) [periodo_id]

resultados_nomina
  └── lineas_resultado_nomina (N) [resultado_nomina_id]

lineas_resultado_nomina
  ├── evento_biometrico_id → eventos_biometricos (nullable)
  └── ajuste_id → ajustes_biometricos (nullable)
```

### Dominio 6: Ajustes y Aprobaciones

```
ajustes_biometricos
  └── registros_aprobacion (polimórfico, sin FK real) [entidad_id]

justificaciones
  └── registros_aprobacion (polimórfico, sin FK real) [entidad_id]

registros_aprobacion
  └── decidido_por → usuarios
```

### Dominio 7: Integración

```
auditoria_webhooks
  └── evento_biometrico_id → eventos_biometricos (nullable)

tokens_api_externa (tabla independiente; un solo token activo)
```

---

## Restricciones de Integridad Transversales

| Restricción | Tablas | Implementación |
|-------------|--------|----------------|
| Append-only | `eventos_biometricos` | Trigger `BEFORE UPDATE OR DELETE` |
| XOR nulabilidad | `asignaciones_horario`, `asignaciones_regla_nomina` | CHECK constraint en tabla |
| Un solo resultado por colaborador/período | `resultados_nomina` | UNIQUE (`periodo_id`, `colaborador_id`) |
| Un solo token API activo | `tokens_api_externa` | Lógica en capa de aplicación + índice parcial |
| Un solo token recuperación pendiente por usuario | `tokens_recuperacion` | Lógica en capa de aplicación |
| `inicio_periodo` = lunes | `periodos_semanales` | CHECK constraint |

---

## Volumen Estimado (Single-Tenant)

| Tabla | Crecimiento | Notas |
|-------|-------------|-------|
| `eventos_biometricos` | Alto, continuo | 2 eventos/día × N colaboradores × 52 semanas |
| `auditoria_webhooks` | Alto, continuo | 1:1 con webhooks recibidos |
| `lineas_resultado_nomina` | Medio | 5–10 líneas por colaborador por semana |
| `intentos_login` | Bajo | Solo para auditoría |
| `tipos_verificacion` | Estático | 9 filas fijas del proveedor |
| resto | Bajo-Medio | Datos de configuración y resultados semanales |

---

## Estado vs. Lifecycle por Entidad

| Entidad | Estados posibles | Transiciones permitidas |
|---------|-----------------|------------------------|
| `sesiones_usuario` | `activo → expirado`, `activo → cerrado` | No reversibles |
| `tokens_recuperacion` | `pendiente → usado`, `pendiente → expirado` | No reversibles |
| `ajustes_biometricos` | `pendiente → aprobado`, `pendiente → rechazado` | No reversibles |
| `justificaciones` | `pendiente → aprobado`, `pendiente → rechazado` | No reversibles |
| `periodos_semanales` | `abierto → cerrado → reabierto → cerrado` | Solo Admin puede reabrir |
| `resultados_nomina` | `borrador → aprobado` | Solo Admin puede aprobar |
| `tokens_api_externa` | `activo → inactivo (revocado)` | No reversible |
