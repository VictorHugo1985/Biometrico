# Feature Specification: Liquidación Semanal de Horas Trabajadas

**Feature Branch**: `007-liquidacion-semanal`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "Gestionar el pago de las horas trabajadas, seleccionando el periodo a contabilizar (generalmente semanal, de sábado a viernes). Contabilizando las horas, señalando los atrasos y permitiendo por cada registro observado definir si aplica el pago completo de la hora o penalidad en la hora o penalidad en la tarifa general del periodo contabilizado (osea cambiar de 15bs la hora a 13) debido a que no cumplió con el objetivo mínimo de asistencia u otro motivo."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar liquidación del período (Priority: P1)

El administrador selecciona la semana a liquidar (sábado a viernes), y el sistema calcula automáticamente las horas trabajadas por cada colaborador activo comparándolas con su horario asignado. El sistema también identifica y marca los registros observados: atrasos, ausencias y salidas anticipadas.

**Why this priority**: Sin este cálculo automático no existe base para decidir penalidades ni aprobar el pago. Es el punto de entrada obligatorio de todo el flujo de nómina.

**Independent Test**: Se puede probar de forma aislada generando una liquidación para una semana con datos biométricos existentes y verificando que las horas totales por colaborador coincidan con los eventos registrados.

**Acceptance Scenarios**:

1. **Given** existen eventos biométricos en el período seleccionado, **When** el administrador genera la liquidación, **Then** el sistema muestra para cada colaborador: total de horas trabajadas, cantidad de atrasos, ausencias y la tarifa asignada.
2. **Given** un colaborador llegó tarde en dos días de la semana, **When** se genera la liquidación, **Then** esos días aparecen marcados como registros observados con el tipo "Atraso" y los minutos de diferencia respecto a su horario.
3. **Given** ya existe una liquidación aprobada para el período seleccionado, **When** el administrador intenta generar otra, **Then** el sistema informa que ese período ya fue cerrado y no permite duplicarla.

---

### User Story 2 - Revisar y decidir sobre registros observados (Priority: P1)

Para cada registro marcado como observado (atraso, ausencia, salida anticipada), el administrador decide individualmente cuál de los tres tratamientos aplica: pago completo sin descuento, penalidad en esa hora específica, o reducción de la tarifa general para todo el período.

**Why this priority**: La decisión sobre cada registro observado es el núcleo del negocio: sin ella, el cálculo de pago es incorrecto. Debe completarse antes de aprobar.

**Independent Test**: Se puede probar de forma aislada sobre un registro observado específico, asignándole cada uno de los tres tratamientos y verificando que el total calculado varía según lo esperado.

**Acceptance Scenarios**:

1. **Given** existe un registro observado de tipo "Atraso", **When** el administrador selecciona "Pago completo", **Then** esa hora se paga íntegramente al valor de tarifa del colaborador sin ningún descuento.
2. **Given** existe un registro observado de tipo "Atraso", **When** el administrador selecciona "Penalidad en la hora" e ingresa el valor reducido para esa hora (ej. 5 Bs en lugar de 15 Bs), **Then** solo esa hora queda con el valor reducido y el resto del período mantiene la tarifa original.
3. **Given** el administrador determina que el colaborador no cumplió el mínimo de asistencia del período, **When** selecciona "Penalidad en tarifa general" e ingresa la nueva tarifa (ej. 13 Bs/hora), **Then** todas las horas del período para ese colaborador se recalculan con la nueva tarifa.
4. **Given** el administrador aplica una penalidad, **When** intenta guardar sin ingresar una justificación, **Then** el sistema le exige completar el campo de motivo antes de confirmar.
5. **Given** quedan registros observados sin decisión, **When** el administrador intenta aprobar la liquidación, **Then** el sistema bloquea la aprobación y señala los registros pendientes.

---

### User Story 3 - Ver resumen y aprobar la liquidación (Priority: P2)

Tras resolver todos los registros observados, el administrador revisa el resumen consolidado: horas por colaborador, penalidades aplicadas y monto total a pagar. Si todo es correcto, aprueba el período quedando este bloqueado para cambios.

**Why this priority**: La aprobación es el cierre formal del proceso; sin ella la liquidación no tiene validez para pago y puede ser alterada accidentalmente.

**Independent Test**: Se puede probar creando una liquidación con todos los registros observados resueltos y verificando que el sistema permite aprobar y que luego bloquea ediciones.

**Acceptance Scenarios**:

1. **Given** todos los registros observados están resueltos, **When** el administrador accede al resumen, **Then** ve por colaborador: total de horas trabajadas, penalidades aplicadas, tarifa efectiva y monto total a cobrar.
2. **Given** el resumen es correcto, **When** el administrador aprueba la liquidación, **Then** el período queda en estado "Aprobado", bloqueado para cualquier edición posterior.
3. **Given** la liquidación está aprobada, **When** cualquier usuario intenta modificar un registro o penalidad de ese período, **Then** el sistema rechaza el cambio e indica que el período está cerrado.

---

### User Story 4 - Ver bonos confirmados en el resumen del período (Priority: P1)

El supervisor revisa el resumen del período antes de la aprobación y ve, por cada colaborador, los bonos de transporte y alimentación confirmados sumados al total. El supervisor puede navegar al desglose diario para confirmar o rechazar bonos pendientes sin salir del flujo de liquidación.

**Why this priority**: La constitución (Principio II) exige que los bonos de transporte y alimentación sean parte del cálculo de la liquidación semanal. Sin esta integración el total semanal está incompleto y no refleja el pago real.

**Independent Test**: Un colaborador con 5 días trabajados, 3 bonos de transporte confirmados (10 Bs c/u) y 2 bonos de alimentación confirmados (8 Bs c/u) tiene un total de bonos de 46 Bs. El resumen del período lo muestra sumado al total de horas trabajadas.

**Acceptance Scenarios**:

1. **Given** un colaborador con bonos de transporte y/o alimentación confirmados en el período, **When** el supervisor accede al resumen de la liquidación, **Then** ve el subtotal de horas, el subtotal de bonos confirmados y el total combinado por colaborador.
2. **Given** el resumen del período, **When** hay bonos elegibles aún pendientes de confirmación para algún colaborador, **Then** el sistema muestra una advertencia indicando que hay bonos sin confirmar y permite navegar al desglose diario de ese colaborador.
3. **Given** el supervisor navega desde el resumen al desglose diario de un colaborador, **When** confirma o rechaza bonos pendientes, **Then** al volver al resumen el total actualizado refleja los cambios.
4. **Given** todos los bonos pendientes han sido gestionados (confirmados o rechazados), **When** el supervisor revisa el resumen, **Then** el total por colaborador incluye únicamente los bonos confirmados.

---

### User Story 5 - Consultar liquidaciones anteriores (Priority: P3)

El administrador puede revisar el historial de liquidaciones cerradas para auditoría, verificando los montos pagados y las penalidades aplicadas en cualquier período anterior.

**Why this priority**: Necesario para auditoría y resolución de disputas. No afecta el flujo operativo principal, pero es obligatorio para trazabilidad.

**Independent Test**: Se puede probar listando períodos cerrados y verificando que los montos y decisiones de cada uno no pueden modificarse.

**Acceptance Scenarios**:

1. **Given** existen liquidaciones aprobadas, **When** el administrador consulta el historial, **Then** ve la lista de períodos con fecha, estado y monto total liquidado.
2. **Given** el administrador selecciona una liquidación aprobada, **When** accede al detalle, **Then** ve el desglose completo por colaborador incluyendo todas las penalidades aplicadas y sus justificaciones.

---

### Edge Cases

- ¿Qué ocurre si un colaborador no tiene ningún registro biométrico en toda la semana (ausencia total)?
- ¿Qué pasa si el colaborador fue dado de baja durante el período a liquidar?
- ¿Cómo se trata un colaborador que tiene registros biométricos pero sin horario asignado?
- ¿Puede el administrador eliminar una liquidación en estado borrador y regenerarla si detecta un error en los datos de origen?
- ¿Qué ocurre si se reciben eventos biométricos con fecha dentro de un período ya aprobado?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir seleccionar un período de liquidación definido como sábado a viernes (semana laboral estándar del negocio).
- **FR-002**: El sistema DEBE calcular automáticamente las horas trabajadas por cada colaborador activo en el período, basándose en los eventos biométricos registrados y su horario asignado.
- **FR-003**: El sistema DEBE identificar y marcar como "registros observados" los días en que el colaborador llegó tarde, se ausentó, o salió antes de la hora de fin de su horario.
- **FR-004**: Para cada registro observado, el sistema DEBE ofrecer tres opciones de tratamiento excluyentes: pago completo, penalidad en la hora afectada, o penalidad en la tarifa general del período.
- **FR-005**: La penalidad por hora DEBE permitir al administrador definir el valor de remuneración para esa hora específica (valor libre en Bs), diferente a la tarifa base del colaborador.
- **FR-006**: La penalidad en tarifa general DEBE reemplazar la tarifa base del colaborador para el cálculo de TODAS las horas del período, no solo las observadas.
- **FR-007**: El sistema DEBE exigir una justificación de texto libre al aplicar cualquier tipo de penalidad.
- **FR-008**: El sistema DEBE calcular el monto total a pagar por colaborador como: (horas trabajadas × tarifa efectiva) + suma de bonos confirmados (transporte y alimentación), considerando los ajustes por penalidades individuales y/o de tarifa general. La gestión detallada de bonos día a día se especifica en spec 010.
- **FR-008b**: El resumen del período DEBE mostrar por colaborador el desglose separado: subtotal de horas, subtotal de bonos de transporte confirmados, subtotal de bonos de alimentación confirmados y total combinado.
- **FR-008c**: Si un colaborador tiene bonos elegibles o agregados manualmente (spec 010) aún en estado "pendiente de confirmar" al momento de revisar el resumen, el sistema DEBE mostrar advertencia visible para ese colaborador.
- **FR-009**: El sistema DEBE bloquear la aprobación del período si quedan registros observados sin decisión asignada.
- **FR-010**: El sistema DEBE mostrar un resumen consolidado antes de la aprobación: horas, penalidades y monto total por colaborador.
- **FR-011**: Una vez aprobado un período, el sistema DEBE impedir cualquier modificación sobre esa liquidación.
- **FR-012**: El sistema DEBE conservar el historial completo de todas las liquidaciones aprobadas, incluyendo las decisiones y justificaciones de cada registro observado.
- **FR-013**: El sistema DEBE permitir regenerar una liquidación en estado borrador si el administrador detecta un error (regeneración descarta la anterior en borrador y recalcula desde cero).
- **FR-014**: El sistema DEBE registrar quién aprobó cada liquidación y en qué momento.

### Key Entities

- **Período de Liquidación**: Semana sábado–viernes con estado (borrador / en_revisión / aprobado), fecha de generación y de aprobación.
- **Resumen de Colaborador en el Período**: Total de horas trabajadas, tarifa efectiva, monto calculado, cantidad de registros observados pendientes y resueltos.
- **Registro Observado**: Día o evento específico que se desvía del horario esperado; tiene tipo (atraso / ausencia / salida_anticipada), magnitud (minutos de diferencia), decisión (pago_completo / penalidad_hora / penalidad_tarifa) y justificación.
- **Penalidad por Hora**: Valor de remuneración alternativo (en Bs) para la hora o fracción observada de un día específico.
- **Ajuste de Tarifa del Período**: Tarifa por hora reducida (en Bs) aplicada a la totalidad del período para un colaborador específico, reemplazando su tarifa base.
- **Perfil de Tarifa**: Tarifa base del colaborador definida en el módulo de gestión de colaboradores; es el punto de partida antes de aplicar penalidades.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador puede generar la liquidación de una semana completa con hasta 50 colaboradores en menos de 30 segundos.
- **SC-002**: El 100% de los registros observados de un período tiene una decisión asignada antes de poder aprobar; el sistema impone esta restricción sin excepción.
- **SC-003**: El monto total calculado por el sistema coincide con el cálculo manual para el 100% de los casos de prueba: (horas × tarifa efectiva con ajustes) + bonos confirmados.
- **SC-004**: El administrador puede revisar y resolver todos los registros observados de un colaborador promedio en menos de 5 minutos.
- **SC-005**: Una liquidación aprobada no puede ser modificada bajo ninguna circunstancia; el sistema garantiza inmutabilidad del 100% de los registros aprobados.
- **SC-006**: El historial completo de cualquier liquidación anterior es accesible en menos de 5 segundos.

## Assumptions

- El período de liquidación siempre comienza el sábado y termina el viernes (semana laboral del negocio); no se admiten períodos personalizados en esta versión.
- El rol **supervisor** puede generar, revisar y enviar la liquidación para aprobación; confirmar y rechazar bonos diarios (spec 010); y consultar el historial. El rol **administrador** tiene acceso total incluyendo la aprobación final del período.
- Las horas trabajadas se calculan a partir de los pares de eventos biométricos (entrada/salida) del colaborador; si falta el evento de salida, ese día se marca como registro observado de tipo "salida_no_registrada".
- Un colaborador sin horario asignado no puede incluirse en una liquidación; el sistema lo excluye y lo notifica.
- El "mínimo de asistencia" es un criterio de negocio que el administrador evalúa visualmente; el sistema no lo calcula automáticamente, solo provee la información de horas y atrasos para que el administrador tome la decisión.
- Una liquidación en estado "borrador" puede regenerarse o eliminarse; una en estado "aprobado" es inmutable.
- El valor de la tarifa base (ej. 15 Bs/hora) proviene del perfil de tarifa asignado al colaborador en el módulo de gestión de colaboradores.
- Los montos se expresan en Bolívares (Bs); no se contempla multimoneda en esta versión.
- Las horas extras (trabajo más allá del horario) no están en el alcance de esta especificación; solo se contabilizan las horas dentro del horario establecido.
- Los bonos de transporte y alimentación son parte del total semanal per constitución (Principio II). La lógica de elegibilidad, confirmación y rechazo de bonos se detalla en spec 010; esta spec los integra en el cálculo final.
