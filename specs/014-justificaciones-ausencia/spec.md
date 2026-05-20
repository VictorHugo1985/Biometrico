# Feature Specification: Justificaciones de Ausencia

**Feature Branch**: `014-justificaciones-ausencia`

**Created**: 2026-05-20

**Status**: Draft

**Input**: Prerequisito identificado en revisión de backlog: el supervisor necesita justificar ausencias de colaboradores para que el sistema las considere correctamente en la liquidación y no las trate como descuentos injustificados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar justificación de ausencia (Priority: P1)

El supervisor identifica que un colaborador no tuvo marcaciones biométricas en un día pero la ausencia tiene causa válida (permiso médico, licencia, permiso personal). Registra la justificación con el tipo de ausencia, el motivo y, si dispone de él, adjunta el documento de respaldo.

**Why this priority**: Sin justificaciones, toda ausencia se trata igual en la liquidación. El sistema necesita distinguir ausencias justificadas de injustificadas para aplicar correctamente los descuentos o exenciones.

**Independent Test**: El supervisor registra una justificación de "permiso médico" para un colaborador en un día sin marcaciones. El sistema registra la justificación con estado "pendiente de aprobación" y la vincula al colaborador y al día.

**Acceptance Scenarios**:

1. **Given** un colaborador sin marcaciones biométricas en un día, **When** el supervisor registra una justificación con tipo y motivo, **Then** la justificación queda en estado "pendiente de aprobación" vinculada al colaborador y al día.
2. **Given** el supervisor registra una justificación, **When** adjunta un documento de respaldo (foto o PDF), **Then** el documento queda asociado a la justificación y disponible para revisión.
3. **Given** el supervisor intenta registrar una justificación sin ingresar motivo, **When** intenta guardar, **Then** el sistema exige el campo de motivo.
4. **Given** un período ya aprobado, **When** el supervisor intenta registrar una justificación en ese período, **Then** el sistema impide la acción e informa que el período está cerrado.
5. **Given** el colaborador ya tiene una justificación registrada para ese día, **When** el supervisor intenta agregar una segunda, **Then** el sistema impide duplicados y muestra la justificación existente.

---

### User Story 2 - Aprobar o rechazar justificación (Priority: P1)

El administrador revisa las justificaciones pendientes de aprobación y decide aprobar o rechazar cada una. Las justificaciones aprobadas afectan el cálculo de la liquidación; las rechazadas quedan registradas sin efecto en el pago.

**Why this priority**: La aprobación por un rol superior es el control de negocio que garantiza que ninguna ausencia se justifique sin revisión (Principio VI de la constitución).

**Independent Test**: El administrador aprueba una justificación pendiente. El sistema cambia su estado a "aprobado" y registra quién aprobó y cuándo. El colaborador ya no figura con descuento por ese día en la liquidación.

**Acceptance Scenarios**:

1. **Given** una justificación en estado "pendiente de aprobación", **When** el administrador la aprueba, **Then** cambia a estado "aprobado" con registro del aprobador y timestamp.
2. **Given** una justificación en estado "pendiente de aprobación", **When** el administrador la rechaza e ingresa motivo, **Then** cambia a estado "rechazado" con el motivo registrado; no afecta la liquidación.
3. **Given** el administrador intenta rechazar una justificación sin motivo, **When** intenta guardar, **Then** el sistema exige el campo de motivo del rechazo.
4. **Given** una justificación aprobada en un período no cerrado, **When** el administrador necesita revocarla, **Then** puede cambiar el estado a "rechazado" con nuevo motivo mientras el período no esté aprobado.

---

### User Story 3 - Efecto de la justificación en la liquidación (Priority: P1)

Cuando el sistema calcula la liquidación semanal, considera las justificaciones aprobadas para cada día sin marcación. Una justificación aprobada puede eximir al colaborador del descuento por ausencia en ese día, según el tipo configurado.

**Why this priority**: El efecto en la liquidación es el propósito final de la justificación. Sin esta integración, registrar justificaciones no tiene valor económico.

**Independent Test**: Un colaborador ausente un día con justificación aprobada de tipo "licencia con pago" no tiene descuento en su liquidación de esa semana. Un colaborador ausente sin justificación sí tiene el descuento aplicado.

**Acceptance Scenarios**:

1. **Given** un colaborador con ausencia justificada aprobada de tipo "con pago", **When** el sistema calcula la liquidación semanal, **Then** ese día no genera descuento por ausencia.
2. **Given** un colaborador con ausencia justificada aprobada de tipo "sin pago", **When** el sistema calcula la liquidación, **Then** ese día tampoco genera descuento por ausencia injustificada pero no suma horas al pago ordinario.
3. **Given** un colaborador con ausencia sin justificación registrada, **When** el sistema calcula la liquidación, **Then** aplica el descuento configurado por ausencia injustificada.
4. **Given** una justificación en estado "pendiente" (no aún aprobada), **When** el sistema calcula la liquidación, **Then** trata el día como ausencia sin justificación confirmada y advierte que hay justificaciones pendientes de aprobación en el período.

---

### User Story 4 - Colaborador consulta sus justificaciones (Priority: P2)

El colaborador puede ver en su historial personal las justificaciones registradas para sus días de ausencia: el tipo, el estado (pendiente, aprobado, rechazado) y el motivo si fue rechazada.

**Why this priority**: La transparencia con el colaborador es parte del Principio VI; el colaborador debe poder verificar que sus ausencias justificadas fueron procesadas correctamente.

**Acceptance Scenarios**:

1. **Given** el colaborador consulta su historial, **When** hay justificaciones registradas para sus días de ausencia, **Then** las ve con estado y tipo claramente indicados.
2. **Given** una justificación rechazada, **When** el colaborador la consulta, **Then** ve el motivo del rechazo registrado por el administrador.
3. **Given** el colaborador intenta modificar una justificación, **When** intenta interactuar con ella, **Then** el sistema no permite ninguna edición (solo lectura para el colaborador).

---

### Edge Cases

- ¿Puede justificarse un día con marcaciones biométricas? → No aplica: las justificaciones son exclusivamente para días sin marcaciones. Si hay marcaciones, el sistema ya tiene datos para calcular.
- ¿Puede el supervisor registrar una justificación para cualquier día del período, incluso días futuros? → Solo para días pasados o el día en curso; no días futuros.
- ¿Qué pasa si el administrador aprueba una justificación después de que el período fue aprobado? → No puede: el período aprobado es inmutable. La justificación queda registrada pero sin efecto retroactivo.
- ¿Puede haber más de un tipo de justificación para el mismo día (ej. medio día)? → En v1: una justificación por día por colaborador, cubre el día completo.
- ¿Puede el supervisor justificar ausencias de colaboradores de otras áreas? → No; solo de su área asignada. El administrador puede justificar para cualquier área.

## Requirements *(mandatory)*

### Functional Requirements

**Registro**

- **FR-001**: El supervisor DEBE poder registrar una justificación de ausencia para cualquier día sin marcaciones biométricas de colaboradores de su área, mientras el período no esté aprobado. La justificación requiere: tipo de ausencia, motivo de texto libre y opcionalmente un documento adjunto.
- **FR-002**: Solo puede existir una justificación por colaborador por día. El sistema DEBE impedir duplicados.
- **FR-003**: El sistema DEBE soportar al menos los siguientes tipos de ausencia configurables por el administrador: "Permiso médico", "Licencia con pago", "Licencia sin pago", "Permiso personal", "Fuerza mayor". Los tipos son configurables; el administrador puede agregar nuevos.
- **FR-004**: El documento adjunto a una justificación acepta los mismos tipos y límites de tamaño que los adjuntos del registro diario (spec 011): JPEG, PNG, PDF, máx. 10 MB.

**Aprobación**

- **FR-005**: Solo el rol administrador puede aprobar o rechazar justificaciones. El rechazo exige motivo obligatorio.
- **FR-006**: Toda aprobación y rechazo DEBE registrar: usuario que realizó la acción, timestamp y motivo (en caso de rechazo). Cumplimiento del Principio VI.
- **FR-007**: El administrador puede revocar una justificación aprobada (cambiar a rechazado con nuevo motivo) mientras el período no esté aprobado.

**Efecto en liquidación**

- **FR-008**: Al calcular la liquidación, el sistema DEBE evaluar si cada día sin marcaciones tiene justificación aprobada. Si la tiene y es de tipo "con pago", no aplica descuento. Si es de tipo "sin pago", no aplica descuento de ausencia injustificada pero tampoco suma horas al pago.
- **FR-009**: Si hay justificaciones en estado "pendiente" al momento de calcular la liquidación, el sistema DEBE mostrar una advertencia visible al supervisor e indicar qué colaboradores tienen justificaciones sin resolver.
- **FR-010**: El tipo de descuento aplicado por ausencia injustificada (monto o porcentaje) DEBE ser configurable por el administrador, alineado con las reglas de nómina (spec 013).

**Acceso**

- **FR-011**: El colaborador tiene acceso de solo lectura a sus propias justificaciones. El supervisor accede a las de su área. El administrador accede a todas.

### Key Entities

- **Justificación de Ausencia**: Registro asociado a un colaborador y a una fecha sin marcaciones biométricas; tiene tipo de ausencia, motivo, estado (pendiente / aprobado / rechazado), documento adjunto opcional, registrador (supervisor), aprobador (admin) y timestamps.
- **Tipo de Ausencia**: Catálogo configurable de razones de ausencia que define si la ausencia es "con pago" o "sin pago" para efectos del cálculo de liquidación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El supervisor puede registrar una justificación completa (con adjunto) en menos de 2 minutos.
- **SC-002**: El 100% de las justificaciones aprobadas están correctamente reflejadas en el cálculo de la liquidación del período correspondiente.
- **SC-003**: El 100% de los rechazos tienen motivo registrado; ningún rechazo anónimo existe en el sistema.
- **SC-004**: El sistema advierte al supervisor sobre justificaciones pendientes antes de que el período sea enviado para aprobación, en el 100% de los casos.

## Assumptions

- Las justificaciones aplican a días completos en v1; medios días o ausencias parciales se gestionan a través de ajustes manuales en la liquidación, no mediante justificaciones.
- El monto o porcentaje de descuento por ausencia injustificada se configura en la regla de nómina (spec 013); por defecto en v1 es 0 (sin descuento automático) hasta que el administrador lo configure.
- El flujo de aprobación es de dos niveles: supervisor registra → administrador aprueba. No existe auto-aprobación.
- Los tipos de ausencia del catálogo ("con pago" o "sin pago") determinan el efecto en liquidación; el supervisor no puede elegir el efecto directamente, solo el tipo.
- Las justificaciones no generan derecho a bonos de transporte o alimentación aunque sean de tipo "con pago" (consistente con spec 010 y las clarificaciones de que los bonos requieren marcación biométrica).
