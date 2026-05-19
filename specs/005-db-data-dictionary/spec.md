# Feature Specification: Diccionario de Datos Relacional — Contrato de Base de Datos

**Feature Branch**: `005-db-data-dictionary`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Crear una especificación que tenga definida la BD Relacional (Diccionario de datos), que sea el contrato sobre el cual se aplicarán todas las implementaciones."

---

> **Este documento es el contrato de datos del sistema.** Toda implementación de backend, frontend, migración, API y servicio DEBE derivarse de las definiciones aquí establecidas. Ninguna columna, tabla o relación puede existir en la base de datos que no esté declarada en este documento, y ninguna columna aquí declarada puede omitirse sin modificar previamente este contrato.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Implementación Guiada por el Contrato (Priority: P1)

Como **desarrollador de backend**, quiero disponer de un diccionario de datos completo y aprobado antes de escribir cualquier migración o servicio, para que toda capa de código sea derivable directamente desde este documento sin decisiones de modelado adicionales.

**Why this priority**: En un enfoque database-first, el diccionario de datos es la fuente de verdad. Si no existe antes del desarrollo, cada desarrollador toma decisiones de modelado independientes que generan inconsistencias difíciles de reconciliar.

**Independent Test**: Un desarrollador puede generar el DDL completo de la base de datos basándose únicamente en este documento, y el resultado debe coincidir con el esquema de producción sin diferencias de columnas, tipos o restricciones.

**Acceptance Scenarios**:

1. **Given** el diccionario de datos está aprobado, **When** el desarrollador implementa una migración para cualquier tabla, **Then** puede mapear cada columna del diccionario a su definición en la migración sin ambigüedad de tipo, restricción o nombre.
2. **Given** el diccionario define una relación FK entre dos tablas, **When** el desarrollador implementa el modelo de datos, **Then** la clave foránea y la tabla referenciada son inequívocas desde el documento.
3. **Given** el diccionario especifica una regla de negocio (ej. append-only), **When** el desarrollador implementa la capa de acceso a datos, **Then** puede derivar las restricciones de escritura directamente del documento.

---

### User Story 2 — Revisión Arquitectónica del Contrato (Priority: P1)

Como **arquitecto del sistema**, quiero revisar el diccionario de datos completo contra los principios de la Constitución del proyecto, para aprobar que el modelo persiste correctamente: inmutabilidad biométrica, cálculo determinístico, reglas versionadas, RBAC, y trazabilidad de ajustes.

**Why this priority**: Un error de modelado detectado aquí cuesta una revisión. El mismo error detectado en producción cuesta una migración disruptiva y posible pérdida de datos históricos.

**Independent Test**: El arquitecto puede verificar que cada principio de la Constitución tiene representación estructural en al menos una tabla del diccionario, sin necesidad de consultar el código.

**Acceptance Scenarios**:

1. **Given** el diccionario está definido, **When** el arquitecto verifica el Principio I (inmutabilidad biométrica), **Then** confirma que `eventos_biometricos` no tiene columnas de actualización y los ajustes se almacenan en `ajustes_biometricos` con referencia al original.
2. **Given** el diccionario está definido, **When** el arquitecto verifica el Principio III (reglas configurables), **Then** confirma que `reglas_nomina` y `plantillas_horario` tienen campos de vigencia (`vigente_desde`, `vigente_hasta`) que permiten versionado.
3. **Given** el diccionario está definido, **When** el arquitecto verifica el Principio VI (trazabilidad), **Then** confirma que `registros_aprobacion`, `ajustes_biometricos` y `justificaciones` registran usuario, timestamp y motivo de cada acción.

---

### User Story 3 — Validación de Cobertura Funcional (Priority: P2)

Como **QA / analista**, quiero verificar que el diccionario de datos soporta todos los flujos funcionales documentados en las especificaciones de features, para confirmar que ningún dato requerido por la aplicación carece de estructura de persistencia.

**Independent Test**: Dado cualquier acceptance scenario de cualquier spec de feature (001–004), se puede trazar el dato que genera o consume ese escenario a una columna específica en este diccionario.

**Acceptance Scenarios**:

1. **Given** el flujo de webhook de CrossChex (spec 001), **When** se mapean los campos del payload al diccionario, **Then** cada campo (`checktype`, `checktime`, `device.serial_number`, `employee.workno`) tiene una columna correspondiente en `eventos_biometricos` o tablas relacionadas.
2. **Given** el flujo de autenticación (spec 004), **When** se mapean las entidades al diccionario, **Then** `usuarios`, `sesiones_usuario`, y `tokens_recuperacion` cubren todos los datos requeridos por ese spec.

---

### Edge Cases

- ¿Qué pasa si se necesita añadir una columna a una tabla ya en producción? El proceso requiere modificar primero este diccionario (nueva versión del contrato) y luego generar la migración correspondiente.
- ¿Qué pasa si dos features necesitan una columna con el mismo nombre pero semántica diferente? El diccionario resuelve el conflicto eligiendo el nombre canónico; las features deben adaptarse al contrato, no al revés.
- ¿Qué pasa si una regla de negocio requiere datos calculados que no están en el diccionario? Los datos calculados se computan en tiempo de consulta; solo los datos fuente se persisten.

---

## Requirements *(mandatory)*

> Las definiciones que siguen constituyen el cuerpo del contrato. Cada tabla es un requisito funcional de la especificación.

---

### Notación

| Símbolo | Significado |
|---------|-------------|
| `PK` | Clave primaria |
| `FK → tabla.col` | Clave foránea |
| `UQ` | Valor único en la tabla |
| `NN` | Not null (obligatorio) |
| `DEFAULT val` | Valor por defecto |
| `†` | Append-only (nunca se actualiza ni elimina) |

Tipos de dato usados (vendor-neutral):

| Tipo | Descripción |
|------|-------------|
| `uuid` | Identificador único universal |
| `texto` | Texto de longitud variable |
| `entero` | Número entero |
| `numerico(p,s)` | Decimal de precisión fija (p dígitos, s decimales) |
| `booleano` | Verdadero / Falso |
| `timestamp_tz` | Fecha y hora con zona horaria |
| `fecha` | Fecha de calendario (sin hora) |
| `hora` | Hora del día (sin fecha) |
| `jsonb` | Documento JSON estructurado |
| `entero[]` | Array de enteros |
| `enum(...)` | Valor restringido a lista fija |

---

### Dominio 1: Identidad y Acceso

---

#### Tabla: `usuarios`

> Cuentas de acceso a la aplicación web. Creadas solo por un Administrador.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `correo` | texto | NN, UQ | — | Correo electrónico; identificador único de login |
| `hash_contrasena` | texto | NN | — | Hash de la contraseña (nunca texto plano) |
| `rol` | enum(`administrador`,`supervisor`,`colaborador`) | NN | — | Rol RBAC del usuario |
| `colaborador_id` | uuid | FK → `colaboradores.id`, nullable | NULL | Vínculo al colaborador si el usuario es también empleado |
| `activo` | booleano | NN | true | false = cuenta desactivada; acceso denegado |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |
| `actualizado_en` | timestamp_tz | NN | now() | Timestamp de última modificación |
| `creado_por` | uuid | FK → `usuarios.id`, nullable | NULL | Usuario que creó esta cuenta (null = primer administrador) |

**Reglas de negocio:**
- `correo` es el único identificador de login; no existe nombre de usuario alternativo.
- Un usuario con `activo = false` no puede autenticarse bajo ninguna circunstancia.
- Si `rol = colaborador`, se recomienda que `colaborador_id` no sea NULL, pero no es obligatorio técnicamente.

---

#### Tabla: `sesiones_usuario`

> Sesiones de autenticación activas. Múltiples sesiones simultáneas permitidas por usuario.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `usuario_id` | uuid | NN, FK → `usuarios.id` | — | Usuario propietario de la sesión |
| `hash_token` | texto | NN, UQ | — | Hash del token de sesión (nunca el token en claro) |
| `direccion_ip` | texto | nullable | NULL | IP de origen del login |
| `info_dispositivo` | texto | nullable | NULL | User-agent o descripción del dispositivo |
| `creado_en` | timestamp_tz | NN | now() | Momento del login |
| `expira_en` | timestamp_tz | NN | — | Expiración por inactividad (configurable, default +8h) |
| `cerrado_en` | timestamp_tz | nullable | NULL | Momento del logout explícito; NULL = sesión no cerrada manualmente |
| `estado` | enum(`activo`,`expirado`,`cerrado`) | NN | `activo` | Estado actual de la sesión |

**Reglas de negocio:**
- Una sesión con `estado = activo` y `expira_en < now()` se considera expirada; la aplicación debe tratar ambos estados como inválidos.
- Al cambiar la contraseña de un usuario, todas sus sesiones activas DEBEN cambiar a `estado = cerrado` con `cerrado_en = now()`.

---

#### Tabla: `tokens_recuperacion`

> Tokens de un solo uso para recuperación de contraseña vía correo electrónico.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `usuario_id` | uuid | NN, FK → `usuarios.id` | — | Usuario al que pertenece el token |
| `hash_token` | texto | NN, UQ | — | Hash del token enviado por correo (nunca en claro) |
| `creado_en` | timestamp_tz | NN | now() | Momento de creación |
| `expira_en` | timestamp_tz | NN | now()+60min | Expiración del token |
| `usado_en` | timestamp_tz | nullable | NULL | Momento en que fue consumido; NULL = no usado |
| `estado` | enum(`pendiente`,`usado`,`expirado`) | NN | `pendiente` | Estado del token |

**Reglas de negocio:**
- Un token es válido solo si `estado = pendiente` y `expira_en > now()`.
- Al usar un token, se actualiza `usado_en = now()` y `estado = usado` de forma atómica.
- Solo puede existir un token `pendiente` por usuario; al solicitar uno nuevo, los anteriores pasan a `expirado`.

---

#### Tabla: `intentos_login`

> Registro de auditoría de intentos de login. Sin lógica de bloqueo; solo para trazabilidad.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `usuario_id` | uuid | FK → `usuarios.id`, nullable | NULL | Usuario identificado (null si el correo no existe) |
| `correo_intentado` | texto | NN | — | Correo ingresado en el intento |
| `direccion_ip` | texto | nullable | NULL | IP de origen |
| `exitoso` | booleano | NN | — | true = login exitoso |
| `intentado_en` | timestamp_tz | NN | now() | Timestamp del intento |

---

### Dominio 2: Organización

---

#### Tabla: `departamentos`

> Unidades organizacionales para agrupar colaboradores y asignar reglas.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `nombre` | texto | NN, UQ | — | Nombre del departamento |
| `descripcion` | texto | nullable | NULL | Descripción opcional |
| `padre_id` | uuid | FK → `departamentos.id`, nullable | NULL | Departamento padre (jerarquía opcional) |
| `activo` | booleano | NN | true | false = departamento desactivado lógicamente |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |
| `actualizado_en` | timestamp_tz | NN | now() | Timestamp de última modificación |

---

#### Tabla: `colaboradores`

> Empleados/trabajadores rastreados por el sistema biométrico. Entidad central de negocio.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `codigo_empleado` | texto | NN, UQ | — | Código de empleado en CrossChex Cloud (clave de vinculación biométrica) |
| `nombre` | texto | NN | — | Nombre del colaborador |
| `apellido` | texto | NN | — | Apellido del colaborador |
| `correo` | texto | nullable, UQ | NULL | Correo personal (opcional; distinto del correo de usuario web) |
| `departamento_id` | uuid | FK → `departamentos.id`, nullable | NULL | Departamento asignado |
| `fecha_ingreso` | fecha | NN | — | Fecha de ingreso a la empresa |
| `fecha_baja` | fecha | nullable | NULL | Fecha de baja; NULL = empleado activo |
| `activo` | booleano | NN | true | false = colaborador inactivo (sin eliminar historial) |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |
| `actualizado_en` | timestamp_tz | NN | now() | Timestamp de última modificación |
| `creado_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que registró al colaborador |

**Reglas de negocio:**
- `codigo_empleado` es el campo de vinculación con CrossChex Cloud; debe coincidir exactamente con `employee.workno` del payload del webhook.
- Un colaborador con `activo = false` no debe recibir nuevos eventos biométricos procesados, pero su historial es inmutable.

---

### Dominio 3: Biométrico

---

#### Tabla: `dispositivos_biometricos`

> Dispositivos Anviz CrossChex registrados en el sistema.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `numero_serie` | texto | NN, UQ | — | Número de serie del dispositivo (de CrossChex) |
| `nombre` | texto | NN | — | Nombre descriptivo del dispositivo |
| `ubicacion` | texto | nullable | NULL | Ubicación física del dispositivo |
| `activo` | booleano | NN | true | false = dispositivo fuera de servicio |
| `registrado_en` | fecha | NN | — | Fecha desde la cual el dispositivo está en uso |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de registro en el sistema |
| `actualizado_en` | timestamp_tz | NN | now() | Timestamp de última modificación |

---

#### Tabla: `tipos_verificacion`

> Tabla de referencia para tipos de verificación biométrica de CrossChex. Valores fijos del proveedor.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `codigo` | entero | PK | — | Código numérico de CrossChex |
| `descripcion` | texto | NN | — | Descripción del método de verificación |
| `activo` | booleano | NN | true | Indica si el código está vigente |

**Valores predefinidos:**

| `codigo` | `descripcion` |
|----------|--------------|
| 1 | ID + Contraseña |
| 6 | Predeterminado |
| 8 | Tarjeta + Contraseña |
| 56 | Tarjeta |
| 64 | Huella + Contraseña / Facial + Contraseña |
| 128 | Referencia interna |
| 144 | Huella + Tarjeta / Facial + Contraseña |
| 192 | Huella / Facial |
| 193 | Huella + Tarjeta + Contraseña |

---

#### Tabla: `eventos_biometricos` †

> Registros de marcación biométrica. **Append-only e inmutables** por el Principio I de la Constitución. Nunca se actualiza ni elimina una fila de esta tabla.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `id_solicitud_externo` | texto | NN, UQ | — | `requestId` del header del webhook CrossChex; garantiza idempotencia ante reenvíos |
| `colaborador_id` | uuid | NN, FK → `colaboradores.id` | — | Colaborador que realizó la marcación |
| `dispositivo_id` | uuid | NN, FK → `dispositivos_biometricos.id` | — | Dispositivo en el que se realizó la marcación |
| `codigo_tipo_verificacion` | entero | NN, FK → `tipos_verificacion.codigo` | — | Tipo de verificación biométrica usada |
| `hora_marcacion` | timestamp_tz | NN | — | Fecha y hora exacta del evento biométrico (del dispositivo) |
| `origen` | enum(`webhook`,`sincronizacion_api`) | NN | — | Canal por el que llegó el registro |
| `recibido_en` | timestamp_tz | NN | now() | Momento en que el sistema lo recibió |
| `payload_crudo` | jsonb | nullable | NULL | Payload original completo (para auditoría y replay) |

**Reglas de negocio:**
- Esta tabla es **solo escritura**. Ningún proceso puede ejecutar `UPDATE` o `DELETE` sobre sus filas.
- La unicidad de `id_solicitud_externo` garantiza que dos solicitudes con el mismo ID de CrossChex produzcan un solo registro.
- Toda corrección a un evento se registra en `ajustes_biometricos`, nunca en esta tabla.

---

#### Tabla: `ajustes_biometricos`

> Correcciones o adiciones sobre eventos biométricos existentes. Requieren aprobación.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `evento_original_id` | uuid | FK → `eventos_biometricos.id`, nullable | NULL | Evento original que se corrige; NULL si es una adición de marcación faltante |
| `colaborador_id` | uuid | NN, FK → `colaboradores.id` | — | Colaborador afectado |
| `periodo_id` | uuid | NN, FK → `periodos_semanales.id` | — | Período semanal al que pertenece el ajuste |
| `tipo_ajuste` | enum(`correccion`,`adicion`,`marca_eliminacion`) | NN | — | Tipo de ajuste |
| `hora_marcacion_ajustada` | timestamp_tz | nullable | NULL | Nueva hora si es una corrección; NULL si es eliminación lógica |
| `motivo` | texto | NN | — | Motivo documentado del ajuste (obligatorio) |
| `estado` | enum(`pendiente`,`aprobado`,`rechazado`) | NN | `pendiente` | Estado del ajuste |
| `creado_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que creó el ajuste |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |
| `aprobado_por` | uuid | FK → `usuarios.id`, nullable | NULL | Usuario que aprobó o rechazó |
| `aprobado_en` | timestamp_tz | nullable | NULL | Timestamp de la decisión |

---

### Dominio 4: Reglas de Negocio Configurables

---

#### Tabla: `plantillas_horario`

> Plantillas de horario laboral. Versionadas con fechas de vigencia mediante `asignaciones_horario`.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `nombre` | texto | NN | — | Nombre del horario |
| `descripcion` | texto | nullable | NULL | Descripción opcional |
| `dias_laborales` | entero[] | NN | — | Días laborales (1=Lunes … 7=Domingo) |
| `hora_entrada` | hora | NN | — | Hora de entrada esperada |
| `hora_salida` | hora | NN | — | Hora de salida esperada |
| `tolerancia_minutos` | entero | NN | 0 | Minutos de tolerancia para tardanza |
| `activo` | booleano | NN | true | false = plantilla archivada |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |
| `actualizado_en` | timestamp_tz | NN | now() | Timestamp de última modificación |
| `creado_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que creó la plantilla |

---

#### Tabla: `asignaciones_horario`

> Asignación de plantillas de horario a colaboradores o departamentos, con fechas de vigencia.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `plantilla_horario_id` | uuid | NN, FK → `plantillas_horario.id` | — | Plantilla de horario asignada |
| `colaborador_id` | uuid | FK → `colaboradores.id`, nullable | NULL | Colaborador específico (exclusivo con `departamento_id`) |
| `departamento_id` | uuid | FK → `departamentos.id`, nullable | NULL | Departamento (exclusivo con `colaborador_id`) |
| `vigente_desde` | fecha | NN | — | Fecha de inicio de vigencia de la asignación |
| `vigente_hasta` | fecha | nullable | NULL | Fecha de fin de vigencia; NULL = vigente indefinidamente |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |
| `creado_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que realizó la asignación |

**Restricción de integridad:** Exactamente uno de `colaborador_id` o `departamento_id` debe ser no nulo en cada fila.

---

#### Tabla: `reglas_nomina`

> Reglas de nómina versionadas: tarifas, horas extra, bonos. Configurables por período.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `nombre` | texto | NN | — | Nombre descriptivo de la regla |
| `tarifa_por_hora` | numerico(10,2) | NN | — | Tarifa base por hora trabajada |
| `umbral_horas_extra` | numerico(4,1) | NN | — | Horas semanales tras las cuales aplica tarifa de hora extra |
| `multiplicador_hora_extra` | numerico(3,2) | NN | — | Factor multiplicador de hora extra (ej. 1.25 = 25% adicional) |
| `bono_transporte_diario` | numerico(10,2) | NN | 0.00 | Bono de transporte por día trabajado |
| `bono_alimentacion_diario` | numerico(10,2) | NN | 0.00 | Bono de alimentación por día trabajado |
| `vigente_desde` | fecha | NN | — | Fecha desde la cual esta regla es aplicable |
| `vigente_hasta` | fecha | nullable | NULL | Fecha hasta la cual es aplicable; NULL = vigente |
| `activo` | booleano | NN | true | false = regla archivada |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |
| `creado_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que creó la regla |

**Reglas de negocio:**
- Para cualquier fecha histórica debe existir exactamente una regla aplicable por colaborador (ya sea directa o vía departamento).
- Modificar una regla vigente requiere crear una nueva versión con `vigente_desde` actualizado, no editar la fila existente.

---

#### Tabla: `asignaciones_regla_nomina`

> Asignación de reglas de nómina a colaboradores o departamentos, con fechas de vigencia.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `regla_nomina_id` | uuid | NN, FK → `reglas_nomina.id` | — | Regla de nómina asignada |
| `colaborador_id` | uuid | FK → `colaboradores.id`, nullable | NULL | Colaborador específico (exclusivo con `departamento_id`) |
| `departamento_id` | uuid | FK → `departamentos.id`, nullable | NULL | Departamento (exclusivo con `colaborador_id`) |
| `vigente_desde` | fecha | NN | — | Inicio de vigencia de la asignación |
| `vigente_hasta` | fecha | nullable | NULL | Fin de vigencia; NULL = vigente |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |
| `creado_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que realizó la asignación |

**Restricción de integridad:** Exactamente uno de `colaborador_id` o `departamento_id` debe ser no nulo.

---

### Dominio 5: Períodos y Nómina

---

#### Tabla: `periodos_semanales`

> Períodos semanales de pago. Unidad fundamental de negocio según Principio IV de la Constitución.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `inicio_periodo` | fecha | NN, UQ | — | Lunes de inicio del período |
| `fin_periodo` | fecha | NN, UQ | — | Domingo de cierre del período |
| `estado` | enum(`abierto`,`cerrado`,`reabierto`) | NN | `abierto` | Estado del ciclo de pago |
| `abierto_en` | timestamp_tz | NN | now() | Momento de apertura |
| `cerrado_en` | timestamp_tz | nullable | NULL | Momento de cierre |
| `cerrado_por` | uuid | FK → `usuarios.id`, nullable | NULL | Administrador que cerró el período |
| `reabierto_en` | timestamp_tz | nullable | NULL | Momento de reapertura (si aplica) |
| `reabierto_por` | uuid | FK → `usuarios.id`, nullable | NULL | Administrador que reabrió el período |
| `notas` | texto | nullable | NULL | Notas del cierre o reapertura |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |

**Reglas de negocio:**
- Los períodos cerrados son inmutables en cuanto a sus resultados de nómina; solo un Administrador puede reabrirlos.
- `inicio_periodo` siempre debe ser lunes y `fin_periodo` siempre domingo (`fin_periodo = inicio_periodo + 6 días`).

---

#### Tabla: `resultados_nomina`

> Resultado calculado de nómina por colaborador por período semanal.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `periodo_id` | uuid | NN, FK → `periodos_semanales.id` | — | Período semanal |
| `colaborador_id` | uuid | NN, FK → `colaboradores.id` | — | Colaborador |
| `regla_nomina_id` | uuid | NN, FK → `reglas_nomina.id` | — | Versión de regla usada en este cálculo |
| `total_horas_ordinarias` | numerico(5,2) | NN | 0.00 | Total horas ordinarias trabajadas |
| `total_horas_extra` | numerico(5,2) | NN | 0.00 | Total horas extras trabajadas |
| `total_pago_ordinario` | numerico(10,2) | NN | 0.00 | Pago por horas ordinarias |
| `total_pago_extra` | numerico(10,2) | NN | 0.00 | Pago por horas extras |
| `total_bono_transporte` | numerico(10,2) | NN | 0.00 | Total bonos de transporte |
| `total_bono_alimentacion` | numerico(10,2) | NN | 0.00 | Total bonos de alimentación |
| `total_descuentos` | numerico(10,2) | NN | 0.00 | Total descuentos aplicados |
| `total_bruto` | numerico(10,2) | NN | 0.00 | Total bruto a pagar |
| `estado` | enum(`borrador`,`aprobado`) | NN | `borrador` | Estado del cálculo |
| `calculado_en` | timestamp_tz | NN | now() | Momento del cálculo |
| `calculado_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que ejecutó el cálculo |

**Restricción de integridad:** UNIQUE (`periodo_id`, `colaborador_id`).

---

#### Tabla: `lineas_resultado_nomina`

> Líneas de detalle del cálculo de nómina. Vinculan el resultado con los eventos biométricos y ajustes que lo originaron.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `resultado_nomina_id` | uuid | NN, FK → `resultados_nomina.id` | — | Resultado al que pertenece esta línea |
| `tipo_linea` | enum(`ordinario`,`hora_extra`,`bono_transporte`,`bono_alimentacion`,`descuento`,`ajuste`) | NN | — | Tipo de línea |
| `descripcion` | texto | NN | — | Descripción legible de la línea |
| `fecha_referencia` | fecha | NN | — | Fecha a la que corresponde la línea |
| `cantidad` | numerico(5,2) | NN | — | Horas o días según corresponda |
| `valor_unitario` | numerico(10,2) | NN | — | Valor unitario (tarifa/hora o monto fijo) |
| `total` | numerico(10,2) | NN | — | cantidad × valor_unitario |
| `evento_biometrico_id` | uuid | FK → `eventos_biometricos.id`, nullable | NULL | Evento biométrico de origen (si aplica) |
| `ajuste_id` | uuid | FK → `ajustes_biometricos.id`, nullable | NULL | Ajuste de origen (si aplica) |

---

### Dominio 6: Ajustes, Justificaciones y Aprobaciones

---

#### Tabla: `justificaciones`

> Justificaciones de ausencia presentadas por supervisores para sus colaboradores.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `colaborador_id` | uuid | NN, FK → `colaboradores.id` | — | Colaborador ausente |
| `periodo_id` | uuid | NN, FK → `periodos_semanales.id` | — | Período al que pertenece la ausencia |
| `fecha_ausencia` | fecha | NN | — | Fecha de la ausencia |
| `tipo_justificacion` | enum(`medica`,`personal`,`permiso_aprobado`,`otro`) | NN | — | Tipo de justificación |
| `descripcion` | texto | NN | — | Descripción del motivo (obligatoria) |
| `afecta_pago` | booleano | NN | false | Si la ausencia justificada afecta el pago |
| `estado` | enum(`pendiente`,`aprobado`,`rechazado`) | NN | `pendiente` | Estado de la justificación |
| `creado_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que creó la justificación |
| `creado_en` | timestamp_tz | NN | now() | Timestamp de creación |

---

#### Tabla: `registros_aprobacion`

> Registro de decisiones de aprobación o rechazo sobre ajustes y justificaciones.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `tipo_entidad` | enum(`ajuste_biometrico`,`justificacion`) | NN | — | Tipo de entidad sobre la que se decide |
| `entidad_id` | uuid | NN | — | ID del ajuste o justificación aprobada/rechazada |
| `decision` | enum(`aprobado`,`rechazado`) | NN | — | Decisión tomada |
| `notas` | texto | nullable | NULL | Notas del aprobador (obligatorias si rechazo) |
| `decidido_por` | uuid | NN, FK → `usuarios.id` | — | Usuario que tomó la decisión |
| `decidido_en` | timestamp_tz | NN | now() | Timestamp de la decisión |

---

### Dominio 7: Integración CrossChex Cloud

---

#### Tabla: `auditoria_webhooks`

> Registro crudo de todos los webhooks recibidos de CrossChex, antes y después del procesamiento.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `id_solicitud_crosschex` | texto | nullable | NULL | `requestId` del header CrossChex (puede ser null si el header falta) |
| `recibido_en` | timestamp_tz | NN | now() | Momento exacto de recepción |
| `cabeceras` | jsonb | NN | — | Todos los headers HTTP recibidos |
| `payload` | jsonb | nullable | NULL | Body JSON del webhook |
| `firma_valida` | booleano | NN | — | Resultado de la validación del `authorize-sign` |
| `estado_procesamiento` | enum(`procesado`,`rechazado`,`fallido`,`duplicado`) | NN | — | Resultado del procesamiento |
| `notas_procesamiento` | texto | nullable | NULL | Descripción del error si `estado_procesamiento = fallido` o `rechazado` |
| `evento_biometrico_id` | uuid | FK → `eventos_biometricos.id`, nullable | NULL | Evento creado como resultado; NULL si no fue procesado |

---

#### Tabla: `tokens_api_externa`

> Tokens JWT obtenidos de CrossChex Cloud para la API REST. Gestión de renovación automática.

| Columna | Tipo | Restricciones | Default | Descripción |
|---------|------|---------------|---------|-------------|
| `id` | uuid | PK | gen_uuid() | Clave primaria |
| `valor_token` | texto | NN | — | El JWT completo (en claro; proteger con cifrado en reposo) |
| `obtenido_en` | timestamp_tz | NN | now() | Momento en que fue emitido/obtenido |
| `expira_en` | timestamp_tz | NN | — | Expiración según el campo `expires` de CrossChex |
| `activo` | booleano | NN | true | false = token revocado o reemplazado |
| `revocado_en` | timestamp_tz | nullable | NULL | Momento de revocación manual |

**Reglas de negocio:**
- Solo debe haber un token con `activo = true` en todo momento.
- Cuando se obtiene un nuevo token, el anterior pasa a `activo = false` y `revocado_en = now()`.

---

### Functional Requirements (Reglas Transversales del Contrato)

- **FR-001**: Toda tabla DEBE tener `id` de tipo `uuid` como clave primaria generada automáticamente.
- **FR-002**: Toda tabla mutable DEBE tener `creado_en` y `actualizado_en` de tipo `timestamp_tz`.
- **FR-003**: La tabla `eventos_biometricos` es append-only; el sistema DEBE rechazar cualquier operación de `UPDATE` o `DELETE` sobre ella a nivel de base de datos.
- **FR-004**: Los campos de dinero (`tarifa_por_hora`, `total_pago_ordinario`, `total_bruto`, etc.) DEBEN usar tipo `numerico(10,2)` para evitar errores de precisión de punto flotante.
- **FR-005**: Las tablas `asignaciones_horario` y `asignaciones_regla_nomina` DEBEN tener exactamente uno de `colaborador_id` o `departamento_id` no nulo por fila; ambos nulos o ambos no nulos es inválido.
- **FR-006**: Ningún token (sesión, recuperación de contraseña, JWT externo) se almacena en texto plano; solo su hash o el token completo con cifrado en reposo.
- **FR-007**: `resultados_nomina` tiene una restricción UNIQUE sobre `(periodo_id, colaborador_id)` para garantizar un único resultado por colaborador por semana.
- **FR-008**: `periodos_semanales.inicio_periodo` siempre es lunes y `fin_periodo = inicio_periodo + 6 días`.

### Key Entities

| # | Tabla | Dominio | Inmutable |
|---|-------|---------|-----------|
| 1 | `usuarios` | Identidad | No |
| 2 | `sesiones_usuario` | Identidad | No |
| 3 | `tokens_recuperacion` | Identidad | No |
| 4 | `intentos_login` | Identidad | Sí (auditoría) |
| 5 | `departamentos` | Organización | No |
| 6 | `colaboradores` | Organización | No |
| 7 | `dispositivos_biometricos` | Biométrico | No |
| 8 | `tipos_verificacion` | Biométrico | Sí (referencia) |
| 9 | `eventos_biometricos` | Biométrico | **Sí (append-only)** |
| 10 | `ajustes_biometricos` | Biométrico | No |
| 11 | `plantillas_horario` | Reglas | No |
| 12 | `asignaciones_horario` | Reglas | No |
| 13 | `reglas_nomina` | Reglas | No |
| 14 | `asignaciones_regla_nomina` | Reglas | No |
| 15 | `periodos_semanales` | Nómina | No |
| 16 | `resultados_nomina` | Nómina | No |
| 17 | `lineas_resultado_nomina` | Nómina | No |
| 18 | `justificaciones` | Ajustes | No |
| 19 | `registros_aprobacion` | Ajustes | Sí (auditoría) |
| 20 | `auditoria_webhooks` | Integración | Sí (auditoría) |
| 21 | `tokens_api_externa` | Integración | No |

**Total: 21 tablas en 7 dominios.**

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El diccionario cubre el 100% de los dominios funcionales de la Constitución sin entidades faltantes identificadas en revisión arquitectónica.
- **SC-002**: Cada campo de dinero en el sistema usa `numerico(10,2)`, verificable inspeccionando la definición de `resultados_nomina`, `reglas_nomina`, y `lineas_resultado_nomina`.
- **SC-003**: Un desarrollador puede generar el DDL completo de las 21 tablas basándose únicamente en este documento, sin resolución de ambigüedades adicionales.
- **SC-004**: Toda relación FK del sistema queda trazable desde este diccionario en una sola consulta de lectura, sin referencias implícitas.
- **SC-005**: El 100% de los campos de tokens y contraseñas están identificados como "nunca en texto plano" en este documento.
- **SC-006**: El diccionario refleja las decisiones de clarificación de todas las features anteriores (001–004) sin contradicciones.

## Assumptions

- El sistema es single-tenant; ninguna tabla contiene columna `empresa_id` ni aislamiento multi-empresa.
- La semana laboral comienza siempre el lunes; `periodos_semanales.inicio_periodo` es invariablemente lunes.
- `uuid` como tipo de clave primaria es el estándar para todas las tablas; no se usan claves enteras autoincrementales.
- Los tipos de bono incluidos en v1 son transporte y alimentación; la tabla `reglas_nomina` es extensible añadiendo columnas en futuras versiones del contrato.
- Los valores de `tipos_verificacion` son fijos y provienen del proveedor CrossChex; no son configurables por el usuario.
- Las monedas se almacenan en la moneda local sin conversión; no hay soporte multi-moneda en v1.
- Los campos `jsonb` (`payload_crudo`, `cabeceras`) son de solo consulta y no tienen esquema validado por la base de datos; la validación de estructura ocurre en la capa de aplicación.
- La función `gen_uuid()` referencia la generación automática de UUID v4 nativa del motor de base de datos.
