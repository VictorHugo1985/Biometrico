# Feature Specification: Diseño del Esquema de Base de Datos Relacional

**Feature Branch**: `003-db-schema-design`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Definir la estructura de una BD relacional y una vez definida basar todo el desarrollo de la aplicacion guiada por la BD."

## Clarifications

### Session 2026-05-18

- Q: ¿El sistema debe soportar múltiples empresas independientes (multi-tenant), o es para una única organización? → A: Una sola empresa (single-tenant); sin `company_id` ni aislamiento multi-empresa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Revisión y Aprobación del Esquema por el Arquitecto (Priority: P1)

Como **arquitecto del sistema**, quiero revisar la documentación completa del esquema relacional con todas sus entidades, atributos, relaciones y restricciones de integridad, para aprobar el diseño antes de que comience el desarrollo de cualquier capa de la aplicación.

**Why this priority**: El esquema es el contrato entre la base de datos y todas las capas de la aplicación. Si se aprueba con ambigüedades, todas las capas construidas sobre él heredarán los errores.

**Independent Test**: El arquitecto puede leer el diagrama entidad-relación y el diccionario de datos, y validar que cubren todos los dominios del sistema: identidad, asistencia biométrica, cálculo de nómina, configuración de reglas y auditoría.

**Acceptance Scenarios**:

1. **Given** el esquema está documentado, **When** el arquitecto revisa el diagrama ER, **Then** puede identificar sin ambigüedad cada entidad, sus atributos clave, y todas las relaciones entre entidades.
2. **Given** el esquema está documentado, **When** el arquitecto verifica la cobertura funcional, **Then** confirma que el esquema soporta todos los principios de la Constitución del proyecto: inmutabilidad biométrica, cálculo determinístico de nómina, reglas configurables versionadas, ciclo semanal de pago, RBAC, y trazabilidad de ajustes.
3. **Given** el esquema incluye tablas de auditoría, **When** el arquitecto simula el flujo de una corrección de marcación, **Then** puede trazar el evento original, el ajuste creado, el usuario que lo realizó, y la aprobación recibida.

---

### User Story 2 — Implementación de Backend Guiada por el Esquema (Priority: P1)

Como **desarrollador de backend**, quiero disponer de un esquema relacional completamente definido (entidades, tipos, restricciones, relaciones) antes de escribir cualquier servicio o API, para que el modelo de datos sea la fuente de verdad y no haya divergencia entre la base de datos y el código.

**Why this priority**: En un enfoque database-first, el esquema precede al código. Si el esquema no está cerrado, los desarrolladores toman decisiones de modelado en el código que crean inconsistencias.

**Independent Test**: Un desarrollador puede implementar un servicio de consulta de registros de asistencia completo (incluyendo joins a empleados y dispositivos) basándose únicamente en el esquema documentado, sin necesidad de aclaración adicional.

**Acceptance Scenarios**:

1. **Given** el esquema está documentado, **When** el desarrollador implementa el módulo de asistencia, **Then** puede mapear directamente cada entidad del esquema a su modelo de datos en el código sin resolver ambigüedades de diseño.
2. **Given** el esquema define restricciones de integridad, **When** la base de datos está operativa con el esquema aplicado, **Then** intentar insertar un evento biométrico con referencia a un empleado inexistente falla a nivel de base de datos, sin necesidad de validación en el código.
3. **Given** el esquema incluye soporte para reglas versionadas, **When** el desarrollador implementa el cálculo de nómina, **Then** puede recuperar la versión de reglas vigente para cualquier semana histórica usando solo las relaciones del esquema.

---

### User Story 3 — Consulta de Historial Auditable (Priority: P2)

Como **administrador del sistema**, quiero poder reconstruir el historial completo de marcaciones, ajustes, cálculos de pago y aprobaciones para cualquier colaborador en cualquier semana, para responder a disputas o auditorías sin depender de logs externos.

**Why this priority**: La Constitución exige trazabilidad completa. Si el esquema no la soporta desde el diseño, añadirla retroactivamente es costoso.

**Independent Test**: Dado un colaborador y una semana laboral cerrada, se puede reconstruir: todos los eventos biométricos originales, todos los ajustes aplicados con su justificación y aprobador, la versión de reglas vigente, y el monto de nómina calculado — usando únicamente relaciones entre tablas del esquema.

**Acceptance Scenarios**:

1. **Given** un colaborador tiene marcaciones y ajustes en una semana cerrada, **When** se consulta el historial de esa semana, **Then** se obtienen los eventos biométricos inmutables separados de los ajustes que los complementan.
2. **Given** existió un cálculo de nómina para esa semana, **When** se consulta la traza del cálculo, **Then** se identifican: reglas aplicadas (con su versión), eventos biométricos de entrada, y monto resultante.
3. **Given** un ajuste fue aprobado por un supervisor, **When** se consulta el registro del ajuste, **Then** se muestra el usuario que lo creó, el usuario que lo aprobó, el timestamp de cada acción, y el motivo documentado.

---

### Edge Cases

- ¿Qué pasa si un empleado es dado de baja? El esquema debe soportar desactivación lógica (sin eliminar datos históricos) para preservar la inmutabilidad del historial.
- ¿Qué pasa si se cambian las reglas de nómina en mitad de una semana? El esquema debe soportar reglas con fecha de inicio/fin de vigencia para que el cálculo use la versión correcta para cada día.
- ¿Qué pasa si un dispositivo biométrico envía el mismo evento dos veces? El esquema debe tener mecanismo de deduplicación (campo `request_id` único de CrossChex).
- ¿Qué pasa si una semana necesita reabrirse para corregir un error? El esquema debe registrar el ciclo de vida del período (abierto, cerrado, reabierto) con trazabilidad.
- ¿Qué pasa si un colaborador no tiene horario asignado para una semana? El esquema debe permitir que existan eventos biométricos sin período laboral configurado, para procesarlos retroactivamente.

## Requirements *(mandatory)*

### Functional Requirements

**Dominio de Identidad y Organización**

- **FR-001**: El esquema DEBE modelar colaboradores con sus datos de identificación, incluyendo el código de empleado (`workno`) usado por el sistema biométrico externo como clave de vinculación.
- **FR-002**: El esquema DEBE modelar usuarios del sistema (acceso a la aplicación web) con su rol RBAC (Administrador, Supervisor, Colaborador) y su vinculación opcional a un colaborador.
- **FR-003**: El esquema DEBE soportar la desactivación lógica de colaboradores y usuarios, preservando todo su historial de datos sin eliminación física.
- **FR-004**: El esquema DEBE modelar grupos o departamentos que permitan asignar reglas de negocio a conjuntos de colaboradores, con posibilidad de sobrescribir por colaborador individual.

**Dominio Biométrico (Inmutable)**

- **FR-005**: El esquema DEBE modelar eventos biométricos como registros de solo escritura (append-only), incluyendo: tipo de verificación (`checktype`), fecha/hora del evento, dispositivo origen, y colaborador.
- **FR-006**: El esquema DEBE modelar dispositivos biométricos con su número de serie, nombre, y estado (activo/inactivo).
- **FR-007**: El esquema DEBE incluir un identificador externo único por evento biométrico (derivado del `requestId` del webhook) para garantizar idempotencia ante reenvíos.
- **FR-008**: El esquema DEBE modelar ajustes de marcación como entidades separadas que referencian el evento original (o el período afectado), nunca modificando el evento biométrico directamente.

**Dominio de Reglas de Negocio Configurables**

- **FR-009**: El esquema DEBE modelar horarios laborales como configuraciones versionadas con fecha de inicio y fin de vigencia, asignables por colaborador o grupo.
- **FR-010**: El esquema DEBE modelar tarifas por hora, umbrales de hora extra, y montos de bonos (transporte, alimentación) como configuraciones versionadas con fecha de vigencia.
- **FR-011**: El esquema DEBE garantizar que para cualquier fecha histórica sea posible recuperar la versión de reglas vigente en ese momento.

**Dominio de Períodos y Nómina**

- **FR-012**: El esquema DEBE modelar períodos semanales de pago como unidades de cierre, con estado (abierto, cerrado, reabierto) y registro de usuario y timestamp por cada cambio de estado.
- **FR-013**: El esquema DEBE modelar el resultado del cálculo de nómina por colaborador por semana, con traza completa que vincule: eventos biométricos considerados, versión de reglas aplicada, y monto calculado.
- **FR-014**: El esquema DEBE soportar el recálculo de la nómina de cualquier semana cerrada produciendo resultados determinísticos idénticos.

**Dominio de Ajustes, Justificaciones y Aprobaciones**

- **FR-015**: El esquema DEBE modelar justificaciones de ausencia y ajustes manuales con: usuario creador, timestamp, motivo textual, referencia al período o evento afectado, y estado de aprobación.
- **FR-016**: El esquema DEBE modelar el flujo de aprobación de ajustes, registrando el aprobador, timestamp de aprobación, y resultado (aprobado/rechazado) para cada ajuste que lo requiera.

**Dominio de Integración y Auditoría**

- **FR-017**: El esquema DEBE modelar los eventos de webhook entrantes (antes del procesamiento) como registro de auditoría con el payload crudo, validez de firma, y resultado del procesamiento.
- **FR-018**: El esquema DEBE modelar los tokens de autenticación de la API REST externa (CrossChex Cloud), incluyendo fecha de expiración para gestión de renovación.
- **FR-019**: El esquema DEBE incluir campos de auditoría estándar (`created_at`, `updated_at`, `created_by`) en todas las entidades que puedan sufrir modificaciones.

### Key Entities

| Entidad | Descripción | Dominio |
|---------|-------------|---------|
| `collaborators` | Colaboradores/empleados de la empresa, con datos de perfil y código biométrico | Identidad |
| `users` | Cuentas de acceso a la aplicación web, vinculadas opcionalmente a un colaborador | Identidad |
| `roles` | Roles RBAC del sistema (Administrador, Supervisor, Colaborador) | Identidad |
| `departments` | Grupos o áreas organizacionales para asignación de reglas | Organización |
| `biometric_events` | Registros de marcación del dispositivo biométrico — inmutables, append-only | Biométrico |
| `biometric_devices` | Dispositivos CrossChex registrados (serial, nombre, estado) | Biométrico |
| `check_types` | Tabla de referencia para tipos de verificación biométrica | Biométrico |
| `biometric_adjustments` | Correcciones sobre eventos o períodos biométricos (referencia al original) | Ajustes |
| `schedule_versions` | Versiones de horario laboral con fecha de inicio/fin de vigencia | Reglas |
| `payroll_rule_versions` | Versiones de tarifas, umbrales de hora extra y montos de bonos | Reglas |
| `weekly_periods` | Períodos semanales de pago con estado de ciclo de vida | Nómina |
| `payroll_results` | Resultado de nómina por colaborador por semana con traza de cálculo | Nómina |
| `payroll_result_lines` | Detalle de líneas del cálculo (ordinarias, extras, bonos, descuentos) | Nómina |
| `justifications` | Justificaciones de ausencia con estado de aprobación | Ajustes |
| `approval_records` | Registro de decisiones de aprobación (aprobado/rechazado) sobre ajustes/justificaciones | Ajustes |
| `webhook_audit_log` | Registro crudo de webhooks entrantes antes de procesamiento | Integración |
| `external_api_tokens` | Tokens JWT de CrossChex Cloud para la API REST | Integración |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El esquema cubre el 100% de los dominios funcionales definidos en la Constitución del proyecto (biométrico, nómina, reglas configurables, RBAC, auditoría) sin entidades faltantes identificadas en revisión.
- **SC-002**: Cualquier desarrollador puede implementar una funcionalidad completa de su módulo asignado basándose únicamente en el esquema documentado, sin necesidad de aclaración adicional (tasa de ambigüedad = 0 en revisión de implementación).
- **SC-003**: El esquema soporta la reconstrucción completa del historial de nómina de cualquier colaborador para cualquier semana histórica usando únicamente consultas relacionales, sin dependencia de logs externos.
- **SC-004**: El 100% de las restricciones de integridad del dominio (unicidad de eventos biométricos, inmutabilidad, referencias válidas) son aplicadas a nivel de base de datos, verificable mediante pruebas de inserción inválida.
- **SC-005**: Para cualquier cambio de regla de negocio (tarifa, horario), el esquema permite recuperar la versión vigente en cualquier fecha histórica en una sola consulta.
- **SC-006**: El esquema soporta el flujo completo de ajuste → aprobación → recálculo de nómina sin ambigüedad en los estados y transiciones de cada entidad.

## Assumptions

- El sistema es para **una sola empresa** (single-tenant); no se incluye soporte multi-empresa. El esquema no requiere columna `company_id` ni aislamiento de datos entre organizaciones.
- La semana laboral comienza el lunes y termina el domingo, conforme al principio IV de la Constitución; si el inicio de semana es configurable, deberá contemplarse en el esquema de períodos.
- Los colaboradores se identifican por su `workno` (código de empleado en CrossChex); este campo es la clave de vinculación con el sistema biométrico externo.
- Un usuario del sistema puede estar vinculado a un colaborador (ej. un empleado que tiene acceso web) o no estarlo (ej. un administrador que no es colaborador).
- Los bonos incluidos inicialmente son transporte y alimentación; el esquema debe ser extensible para añadir nuevos tipos de bono sin cambios estructurales.
- La lógica de cálculo de nómina opera sobre los datos del esquema; el esquema NO almacena reglas como código ejecutable, sino como parámetros configurables (tarifas, umbrales, porcentajes).
- Los eventos biométricos recibidos vía webhook de CrossChex son la fuente primaria de datos; los obtenidos vía API REST son una fuente secundaria para sincronización histórica.
