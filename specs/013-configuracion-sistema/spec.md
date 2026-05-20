# Feature Specification: Configuración de Horarios y Reglas de Nómina

**Feature Branch**: `013-configuracion-sistema`

**Created**: 2026-05-20

**Status**: Draft

**Input**: Prerequisito identificado en revisión de backlog: el administrador necesita configurar horarios y reglas de nómina antes de que el sistema pueda calcular liquidaciones correctamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar regla de nómina (Priority: P1)

El administrador crea o edita una regla de nómina que define cuánto se paga por hora ordinaria, a partir de cuántas horas diarias se activa la hora extra y con qué multiplicador. Esta regla tiene fecha de vigencia para que los cambios no alteren períodos ya calculados.

**Why this priority**: Sin al menos una regla de nómina activa, el sistema no puede calcular ningún pago. Es el prerequisito numérico de toda la liquidación.

**Independent Test**: El administrador crea una regla con tarifa 15 Bs/h, umbral de hora extra 8 h y multiplicador 1.5×. Al asignarla a un colaborador y calcular un día de 10 horas, el sistema produce: (8 × 15) + (2 × 15 × 1.5) = 165 Bs.

**Acceptance Scenarios**:

1. **Given** el administrador accede a configuración de reglas de nómina, **When** crea una nueva regla con tarifa, umbral y multiplicador válidos y fecha de vigencia, **Then** la regla queda activa desde esa fecha y disponible para asignar.
2. **Given** una regla de nómina activa, **When** el administrador la edita y guarda con nueva fecha de vigencia, **Then** la regla anterior permanece vigente para los períodos anteriores a esa fecha; la nueva aplica desde la fecha indicada.
3. **Given** el administrador intenta guardar una regla con tarifa en 0 Bs, **When** intenta confirmar, **Then** el sistema rechaza el valor y exige un monto mayor que cero.
4. **Given** existe una regla asignada a al menos un colaborador activo, **When** el administrador la desactiva, **Then** el sistema advierte que hay colaboradores asignados y exige reasignación antes de desactivar.

---

### User Story 2 - Configurar plantilla de horario (Priority: P1)

El administrador crea una plantilla de horario que define los días laborables de la semana y la hora de entrada y salida esperada. Esta plantilla sirve como referencia para calcular las horas trabajadas y determinar si un turno es de horario extremo.

**Why this priority**: Sin una plantilla de horario, el sistema no puede distinguir horas ordinarias de horas extras ni evaluar los criterios de bonos por horario extremo.

**Independent Test**: El administrador crea una plantilla "Turno Estándar" con lunes a sábado, entrada 7:00, salida 17:00. Al asignarla a un colaborador, el sistema usa esa ventana para calcular las horas del día.

**Acceptance Scenarios**:

1. **Given** el administrador crea una plantilla de horario con días laborables y horas de entrada y salida, **When** la guarda, **Then** queda disponible para asignar a departamentos o colaboradores individuales.
2. **Given** una plantilla con hora de entrada antes de las 6:00 a.m. configurada como límite de madrugada, **When** se evalúa la elegibilidad del bono de transporte, **Then** el sistema reconoce ese día como horario extremo.
3. **Given** el administrador intenta guardar una plantilla sin marcar ningún día laborable, **When** intenta confirmar, **Then** el sistema rechaza la plantilla e indica que debe haber al menos un día activo.
4. **Given** una plantilla ya asignada a colaboradores activos, **When** el administrador la modifica, **Then** los cambios aplican desde la próxima semana; la semana en curso usa la plantilla original.

---

### User Story 3 - Asignar regla y horario a departamento o colaborador (Priority: P1)

El administrador asigna una regla de nómina y una plantilla de horario a un departamento completo. Opcionalmente puede sobrescribir la asignación para un colaborador individual que tenga condiciones distintas a su área.

**Why this priority**: La asignación vincula la configuración con los colaboradores. Sin ella, ninguna regla ni horario tiene efecto en el cálculo.

**Independent Test**: El administrador asigna la regla "Tarifa Estándar" y la plantilla "Turno Mañana" al departamento ACABADO. Todos los colaboradores de ACABADO sin override individual heredan esa configuración automáticamente.

**Acceptance Scenarios**:

1. **Given** el administrador selecciona un departamento y le asigna una regla de nómina y una plantilla de horario, **When** guarda la asignación, **Then** todos los colaboradores de ese departamento sin override individual heredan esa configuración desde la fecha de vigencia.
2. **Given** un colaborador con la regla de su departamento, **When** el administrador le define un override individual con distinta tarifa, **Then** ese colaborador usa su tarifa individual; los demás del departamento siguen con la del departamento.
3. **Given** un colaborador sin asignación de regla de nómina, **When** el sistema intenta calcular su liquidación, **Then** muestra advertencia "sin regla de nómina asignada" y excluye al colaborador del cálculo automático.
4. **Given** el administrador revisa la configuración de un colaborador, **When** consulta su historial, **Then** ve la línea de tiempo completa: qué regla y horario tuvo en cada período.

---

### User Story 4 - Revisar historial de configuración (Priority: P2)

El administrador o supervisor puede consultar qué regla de nómina y plantilla de horario tenía activa un colaborador en cualquier semana pasada, para auditar o explicar por qué se calculó un determinado monto.

**Why this priority**: La trazabilidad de la configuración es el complemento del Principio II de la constitución: no basta que el cálculo sea reproducible, debe ser también explicable.

**Independent Test**: El administrador consulta la configuración vigente de un colaborador para una semana pasada y ve exactamente qué regla y horario aplicaban ese período.

**Acceptance Scenarios**:

1. **Given** un colaborador con cambios de regla a lo largo del tiempo, **When** el administrador consulta su historial de configuración, **Then** ve una línea de tiempo con las reglas vigentes en cada período, sin solapamientos ni vacíos.
2. **Given** el administrador selecciona una semana cerrada, **When** consulta la configuración activa en ese período, **Then** el sistema muestra exactamente la regla y horario que se usaron en el cálculo de esa semana.

---

### Edge Cases

- ¿Qué pasa si se cambia la regla de nómina con un período en curso aún no cerrado? → El período en curso usa la regla vigente al inicio del período (sábado). El cambio aplica al período siguiente.
- ¿Puede un colaborador no tener ninguna regla asignada? → Sí, en estado inicial. El sistema lo marca como "sin configuración" y no lo incluye en el cálculo automático hasta que el administrador lo configure.
- ¿Qué ocurre si se elimina una regla de nómina que tiene períodos cerrados que la usan? → No se permite eliminar; solo desactivar. Los períodos históricos siempre referencian la regla vigente en su momento.
- ¿Puede el multiplicador de hora extra ser menor que 1? → No; el sistema rechaza valores < 1 para el multiplicador.

## Requirements *(mandatory)*

### Functional Requirements

**Reglas de nómina**

- **FR-001**: El administrador DEBE poder crear reglas de nómina con: nombre, tarifa por hora ordinaria (Bs), umbral de horas diarias para activar hora extra, multiplicador de hora extra y fecha de vigencia inicial. Todos los campos son obligatorios excepto la fecha de fin de vigencia.
- **FR-002**: El sistema DEBE impedir guardar una regla con tarifa ≤ 0 Bs o multiplicador de hora extra < 1.
- **FR-003**: Cada cambio a una regla DEBE guardarse como nueva versión con fecha de vigencia; la versión anterior se conserva para cálculos históricos. No se permite edición de versiones pasadas.
- **FR-004**: El administrador puede desactivar una regla solo si no hay colaboradores activos asignados a ella sin alternativa configurada.

**Plantillas de horario**

- **FR-005**: El administrador DEBE poder crear plantillas de horario con: nombre, días laborables de la semana (selección múltiple), hora de entrada, hora de salida y fecha de vigencia. Una plantilla debe tener al menos un día laborable activo.
- **FR-006**: Las plantillas sirven como referencia de jornada esperada; las marcaciones biométricas reales son las que determinan las horas trabajadas efectivas. La plantilla no impide registrar marcaciones fuera del horario definido.
- **FR-007**: El sistema DEBE soportar múltiples plantillas activas simultáneamente para cubrir distintos turnos del mismo departamento.

**Asignaciones**

- **FR-008**: El administrador DEBE poder asignar una regla de nómina y una plantilla de horario a un departamento completo. La asignación tiene fecha de vigencia.
- **FR-009**: El administrador DEBE poder definir overrides individuales de regla de nómina y/o plantilla de horario para colaboradores específicos, con fecha de vigencia propia.
- **FR-010**: En el cálculo de nómina, el sistema DEBE usar primero el override individual; si no existe, usa la asignación del departamento. Si ninguna está configurada, marca al colaborador con advertencia.
- **FR-011**: El historial completo de asignaciones y overrides DEBE ser consultable por el administrador para cualquier colaborador y cualquier período pasado.

**Control de acceso**

- **FR-012**: Solo el rol administrador puede crear, editar y asignar reglas de nómina y plantillas de horario. El supervisor puede consultar la configuración de su área (lectura).

### Key Entities

- **Regla de Nómina**: Define las condiciones económicas del trabajo: tarifa ordinaria, umbral de hora extra y multiplicador. Tiene versión con fecha de vigencia.
- **Plantilla de Horario**: Define la jornada esperada: días laborables, hora de entrada y hora de salida. Tiene versión con fecha de vigencia.
- **Asignación de Configuración**: Vincula una regla y/o plantilla a un departamento o colaborador individual, con fecha de vigencia. Puede ser a nivel departamento (heredada) o individual (override).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador puede crear y asignar una regla de nómina completa a un departamento en menos de 5 minutos.
- **SC-002**: El 100% de los colaboradores activos del sistema tienen una regla de nómina y una plantilla de horario asignada (directa o heredada) antes de que se genere el primer período de liquidación.
- **SC-003**: Al recalcular cualquier semana cerrada, el sistema reproduce el mismo monto usando exactamente la regla vigente en ese período, en el 100% de los casos.
- **SC-004**: El administrador puede consultar la configuración vigente de cualquier colaborador en cualquier semana pasada en menos de 10 segundos.

## Assumptions

- La tarifa por hora y el umbral de hora extra se definen a nivel de regla de nómina; los montos de bonos de transporte y alimentación se definen también en la regla de nómina (campo existente en `reglas_nomina`), complementando la spec 010.
- Una regla de nómina puede compartirse entre múltiples departamentos; no es exclusiva de uno.
- Las plantillas de horario definen la jornada esperada de referencia, no un horario rígido de entrada/salida; el sistema registra la asistencia real sin restricciones.
- En v1 no se soportan turnos rotativos (ej. semana A / semana B); cada colaborador tiene una sola plantilla activa por período.
- Los límites de horario extremo para bonos (hora límite madrugada, hora límite nocturna) se configuran dentro de la regla de nómina o la plantilla de horario, alineado con lo definido en spec 010.
