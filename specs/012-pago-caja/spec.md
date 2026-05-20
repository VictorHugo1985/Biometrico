# Feature Specification: Gestión de Pago por Caja

**Feature Branch**: `012-pago-caja`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "El pago del acumulado semanal (u otro periodo seleccionado) a los colaboradores, lo realiza el rol de Caja, el cual tendria que recibir el consolidado a pagar ya validado por el supervisor del colaborador. La caja recibe el consolidado y registra la confirmacion del pago (tambien puede realizar ajustes al consolidado)"

## Clarifications

### Session 2026-05-20

- Q: ¿Esta especificación introduce un nuevo rol "Caja" no contemplado en la constitución actual (que solo define administrador, supervisor y colaborador)? → A: Sí. La implementación de este flujo requiere enmendar la constitución para incorporar el rol Caja con sus permisos específicos antes de proceder a la planificación técnica.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver consolidados pendientes de pago (Priority: P1)

El cajero accede a su vista de trabajo y ve la lista de consolidados de pago que el supervisor ya aprobó y están pendientes de ser pagados. Cada consolidado muestra el colaborador, el período, el monto total calculado y el estado del pago.

**Why this priority**: Sin visibilidad del trabajo pendiente, el cajero no puede iniciar ninguna gestión de pago. Es el punto de entrada obligatorio de todo el flujo.

**Independent Test**: Con al menos un período de liquidación aprobado por el supervisor, el cajero puede abrir su vista y ver ese período listado como pendiente de pago, con el nombre del colaborador, el período y el monto total.

**Acceptance Scenarios**:

1. **Given** existen períodos aprobados por el supervisor pendientes de pago, **When** el cajero abre su vista de trabajo, **Then** ve la lista de consolidados pendientes ordenados por fecha de aprobación, con colaborador, período y monto calculado.
2. **Given** un período ya fue pagado por Caja, **When** el cajero consulta su historial, **Then** ese período aparece en estado "pagado" con fecha y monto confirmado, no en la cola de pendientes.
3. **Given** no hay consolidados pendientes de pago, **When** el cajero abre su vista, **Then** ve un mensaje que indica que no hay pagos pendientes.
4. **Given** el cajero solo tiene acceso a sus propios registros, **When** consulta la vista, **Then** ve únicamente los consolidados asignados o disponibles para su gestión; no ve datos de configuración de liquidación ni registros biométricos.

---

### User Story 2 - Revisar el detalle del consolidado antes de pagar (Priority: P1)

El cajero selecciona un consolidado pendiente y revisa el desglose completo: horas trabajadas, bonos confirmados, subtotales por día y el total final a pagar. Puede así verificar el monto antes de entregar el dinero o procesar la transferencia.

**Why this priority**: La revisión previa al pago es el control de integridad del cajero; evita errores de monto y permite detectar inconsistencias antes de ejecutar el pago.

**Independent Test**: El cajero puede abrir el detalle de un consolidado pendiente y ver el desglose completo por día (horas × tarifa + bonos), el subtotal y el total final, sin necesidad de consultar otras pantallas.

**Acceptance Scenarios**:

1. **Given** el cajero selecciona un consolidado pendiente, **When** abre el detalle, **Then** ve el desglose completo: nombre del colaborador, período, detalle día a día (horas, tarifa, bonos), subtotales y total final calculado.
2. **Given** el cajero revisa el detalle, **When** el consolidado tiene ajustes previos del supervisor, **Then** esos ajustes y sus motivos son visibles en el desglose.
3. **Given** el cajero no ha realizado ningún ajuste propio, **When** revisa el detalle, **Then** el total mostrado coincide exactamente con el total aprobado por el supervisor.

---

### User Story 3 - Registrar ajuste antes del pago (Priority: P1)

El cajero detecta una situación que requiere modificar el monto a pagar antes de confirmar: un anticipo previo del colaborador, un descuento autorizado, o una corrección de último momento. Registra el ajuste con su monto y motivo obligatorio; el sistema recalcula el total final.

**Why this priority**: Los ajustes de Caja son la válvula de control final del flujo de pago. Sin esta capacidad, el cajero debe interrumpir el proceso y escalar al supervisor para cualquier diferencia, aumentando la fricción operativa.

**Independent Test**: El cajero puede agregar un descuento (ej. anticipo de 50 Bs) y un incremento (ej. bono adicional de 20 Bs) con sus motivos a un consolidado pendiente; el total se recalcula (total calculado − descuento + incremento) y cada ajuste queda registrado con el nombre del cajero, timestamp y motivo.

**Acceptance Scenarios**:

1. **Given** un consolidado pendiente de pago, **When** el cajero agrega un ajuste (descuento o incremento) con monto y motivo, **Then** el total final se recalcula sumando los incrementos y restando los descuentos; el desglose muestra cada línea de ajuste con su tipo y motivo.
2. **Given** el cajero intenta guardar un ajuste sin ingresar motivo, **When** intenta confirmar, **Then** el sistema exige el campo de motivo antes de permitir guardar el ajuste.
3. **Given** un ajuste de Caja registrado, **When** el cajero lo revisa antes de confirmar el pago, **Then** ve el monto original, el ajuste aplicado y el total resultante claramente diferenciados.
4. **Given** el cajero registra un ajuste que resulta en un total negativo, **When** intenta guardarlo, **Then** el sistema impide el ajuste e informa que el total final no puede ser negativo.
5. **Given** un ajuste ya registrado en un consolidado no pagado aún, **When** el cajero lo elimina, **Then** el total vuelve al valor original y la eliminación queda registrada en auditoría.

---

### User Story 4 - Confirmar el pago (Priority: P1)

El cajero, habiendo revisado el consolidado y aplicado los ajustes necesarios, confirma que el pago fue realizado. Registra la fecha de pago, el monto efectivamente entregado y el método de pago. El consolidado pasa a estado "pagado" y queda inmutable.

**Why this priority**: La confirmación de pago es el acto final del ciclo de liquidación; sin ella, el sistema no puede cerrar el ciclo ni el colaborador puede verificar que fue pagado.

**Independent Test**: El cajero confirma el pago de un consolidado; el sistema registra la fecha, el monto y el método, cambia el estado a "pagado", y ya no permite modificaciones sobre ese consolidado.

**Acceptance Scenarios**:

1. **Given** un consolidado con o sin ajustes de Caja, **When** el cajero confirma el pago ingresando fecha, monto y método, **Then** el estado cambia a "pagado" y la confirmación queda registrada con el nombre del cajero y timestamp.
2. **Given** el cajero intenta confirmar el pago sin ingresar la fecha de pago, **When** intenta guardar, **Then** el sistema exige el campo obligatorio.
3. **Given** un consolidado ya confirmado como pagado, **When** cualquier usuario intenta modificarlo, **Then** el sistema impide toda modificación; el registro es inmutable.
4. **Given** el cajero confirma el pago con un monto diferente al total calculado (pago parcial o diferencia de cambio), **When** guarda la confirmación, **Then** el sistema registra el monto confirmado y la diferencia queda visible; si hay diferencia, se exige un motivo.

---

### User Story 5 - Colaborador consulta el estado de su pago (Priority: P2)

El colaborador accede a su historial personal y puede ver, para cada período, si su pago está pendiente, procesado o confirmado por Caja, y el monto que le fue pagado.

**Why this priority**: La transparencia con el colaborador cierra el ciclo de confianza del sistema; permite que el colaborador confirme que recibió lo que le corresponde sin necesidad de consultar al supervisor o al cajero.

**Independent Test**: Un colaborador autenticado puede ver en su historial el período semanal con estado "pagado", la fecha de pago y el monto confirmado por Caja.

**Acceptance Scenarios**:

1. **Given** el pago del colaborador fue confirmado por Caja, **When** el colaborador abre su historial, **Then** ve el período con estado "pagado", la fecha y el monto confirmado.
2. **Given** el período está aprobado por el supervisor pero aún no pagado por Caja, **When** el colaborador consulta su historial, **Then** ve el período con estado "pendiente de pago" y el monto calculado (sin confirmar).
3. **Given** el colaborador consulta el detalle de un período pagado, **When** lo selecciona, **Then** ve el desglose de horas, bonos y ajustes de Caja, pero no puede modificar nada.

---

### Edge Cases

- ¿Qué ocurre si el cajero confirma un pago y luego se detecta un error? → Una vez confirmado, el pago es inmutable; cualquier corrección requiere un ajuste en el siguiente período o un proceso administrativo fuera del sistema (documentado externamente).
- ¿Puede el cajero pagar parcialmente un consolidado (parte en efectivo, parte pendiente)? → No en v1: el pago es total por consolidado; el pago parcial puede manejarse mediante un ajuste de descuento con motivo "anticipo previo".
- ¿Qué pasa si el total calculado del consolidado es 0 Bs después de ajustes? → El cajero puede confirmar un pago de 0 Bs; el sistema lo registra como pagado con monto 0.
- ¿Puede el administrador actuar como cajero? → Sí; el administrador tiene acceso total y puede realizar cualquier acción del rol Caja.
- ¿Puede haber más de un cajero en el sistema? → Sí; múltiples usuarios con rol Caja pueden existir; cada confirmación registra qué cajero la realizó.

## Requirements *(mandatory)*

### Functional Requirements

**Vista de trabajo del cajero**

- **FR-001**: El cajero DEBE tener una vista exclusiva que liste todos los consolidados de pago aprobados por el supervisor y pendientes de confirmación de pago, ordenados por fecha de aprobación del supervisor.
- **FR-002**: La lista de pendientes DEBE mostrar por cada consolidado: nombre del colaborador, área, período, monto total calculado (incluyendo ajustes del supervisor) y fecha de aprobación del supervisor.
- **FR-003**: El cajero DEBE poder filtrar la lista de pendientes por área, colaborador o rango de fechas del período.

**Detalle del consolidado**

- **FR-004**: El cajero DEBE poder acceder al detalle completo del consolidado: desglose día a día (horas trabajadas, tarifa, bonos confirmados), ajustes del supervisor con motivos, subtotales y total final. El cajero no puede modificar el cálculo de horas ni bonos aprobados por el supervisor.
- **FR-005**: El detalle DEBE mostrar claramente el monto original calculado, los ajustes de Caja aplicados y el total final a pagar.

**Ajustes de Caja**

- **FR-006**: El cajero DEBE poder agregar uno o más ajustes al consolidado mientras el pago no esté confirmado. Cada ajuste DEBE tener: tipo (descuento o incremento), monto en Bs y motivo obligatorio de texto libre.
- **FR-007**: El sistema DEBE recalcular el total final automáticamente al agregar o eliminar un ajuste de Caja. Los descuentos restan y los incrementos suman al monto calculado por el supervisor.
- **FR-008**: El sistema DEBE impedir guardar cualquier ajuste que resulte en un total final negativo.
- **FR-009**: El cajero DEBE poder eliminar un ajuste propio mientras el pago no esté confirmado. La eliminación DEBE registrarse en auditoría.
- **FR-010**: Todo ajuste de Caja DEBE registrar: cajero que lo realizó, timestamp y motivo. Cumplimiento del Principio VI.

**Confirmación de pago**

- **FR-011**: El cajero DEBE poder confirmar el pago de un consolidado registrando: fecha de pago (obligatoria), monto efectivamente pagado y método de pago (efectivo por defecto; otros métodos configurables por el administrador).
- **FR-012**: Si el monto confirmado difiere del total calculado, el sistema DEBE exigir un motivo para la diferencia antes de permitir la confirmación.
- **FR-013**: Al confirmar el pago, el consolidado cambia a estado "pagado" y queda inmutable: no se pueden agregar, modificar ni eliminar ajustes ni cambiar el estado.
- **FR-014**: La confirmación de pago DEBE registrar: cajero, timestamp, monto pagado, método y motivo de diferencia si aplica. Cumplimiento del Principio VI.

**Control de acceso**

- **FR-015**: El rol Caja tiene acceso de escritura exclusivamente a la vista de pagos (ajustes y confirmaciones). No puede acceder a la configuración de liquidación, registros biométricos ni configuración de bonos.
- **FR-016**: El administrador puede realizar todas las acciones del rol Caja además de las propias del rol administrador.
- **FR-017**: El colaborador puede ver (solo lectura) el estado de pago de sus propios consolidados, incluyendo los ajustes de Caja y el monto confirmado.

**Historial de pagos**

- **FR-018**: El sistema DEBE mantener un historial completo de todos los pagos confirmados, accesible para el administrador y el cajero. Cada entrada muestra: colaborador, período, monto original, ajustes de Caja, monto pagado, método, cajero y fecha.

### Key Entities

- **Consolidado de Pago**: Agrupación de la liquidación aprobada de un colaborador para un período, que sirve como base para el pago. Tiene estado (pendiente_pago / pagado), monto calculado por el supervisor, ajustes de Caja y monto final confirmado.
- **Ajuste de Caja**: Modificación al monto del consolidado realizada por el cajero antes de confirmar el pago; contiene tipo (descuento / incremento), monto, motivo, cajero y timestamp. Es inmutable una vez confirmado el pago.
- **Confirmación de Pago**: Registro del acto de pago efectuado por el cajero; contiene fecha de pago, monto pagado, método de pago, motivo de diferencia si aplica, cajero y timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El cajero puede revisar, ajustar y confirmar el pago de un colaborador en menos de 3 minutos desde que abre el consolidado.
- **SC-002**: El 100% de las confirmaciones de pago registran cajero, timestamp y monto; ninguna confirmación anónima ni sin fecha existe en el sistema.
- **SC-003**: El 100% de los ajustes de Caja tienen motivo registrado; ningún ajuste sin justificación existe en el sistema.
- **SC-004**: Una vez confirmado un pago, el 100% de los intentos de modificación son bloqueados por el sistema.
- **SC-005**: El colaborador puede consultar el estado de pago de cualquier período anterior en menos de 10 segundos desde que abre su historial.

## Assumptions

- **Nuevo rol Caja**: Esta especificación introduce el rol **Caja** que no existe en la constitución actual (v1.0.1, que define administrador, supervisor y colaborador). La implementación de este feature requiere una enmienda de la constitución (versión MINOR) para agregar el rol Caja con sus permisos antes de la planificación técnica.
- Los ajustes de Caja pueden ser de tipo **descuento** (reducción del monto a pagar) o **incremento** (aumento del monto a pagar), ambos con motivo obligatorio. Los incrementos permiten a Caja agregar conceptos adicionales sin necesidad de volver al nivel de liquidación del supervisor.
- El método de pago por defecto es **efectivo** (Bs). Métodos adicionales (transferencia bancaria, cheque) son configurables por el administrador pero no se especifican en detalle en esta versión.
- El pago es **total por consolidado** en v1: no se admite pago parcial. Un anticipo previo se registra como ajuste de descuento con el motivo correspondiente.
- El cajero no tiene visibilidad de los registros biométricos, configuración de horarios, tarifas ni bonos; su vista está limitada a los consolidados aprobados y el flujo de confirmación de pago.
- Un consolidado llega al flujo de Caja cuando el supervisor aprueba el período de liquidación (spec 007). El estado "aprobado por supervisor" es prerequisito del estado "pendiente de pago".
- Los ajustes realizados por Caja no afectan retroactivamente el cálculo de horas ni bonos del período; son modificaciones exclusivamente al monto final a desembolsar.
- El administrador puede actuar como cajero; no se requiere una cuenta exclusiva de cajero para operación en instancias de un solo operador.
