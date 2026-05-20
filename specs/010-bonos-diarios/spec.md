# Feature Specification: Bonos Diarios de Transporte y Alimentación

**Feature Branch**: `010-bonos-diarios`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "Se requiere que cuando un colaborador cumple los criterios para bono de transporte y/o bono de alimentación, se pueda agregar en el desglose del día al que corresponde, así poder calcular el pago de sus horas y bonos para un día dado."

## Clarifications

### Session 2026-05-19

- Q: ¿Qué configuración de bono aplica si el colaborador cambia de departamento a mitad del período? → A: Se usa el departamento y configuración vigente al inicio del período (sábado). El cambio aplica desde el siguiente período.
- Q: ¿Puede el admin confirmar un bono en un día sin marcaciones biométricas (ausencia justificada)? → A: No. Los bonos requieren al menos una marcación ese día; una ausencia justificada no genera derecho a bonos.
- Q: ¿Qué hace el sistema cuando el departamento no tiene configuración de bonos? → A: Genera el período normalmente; esos colaboradores aparecen con bonos en estado "no configurado" y el sistema muestra advertencia al administrador.
- Q: ¿Quién aprueba los bonos y cómo se sugieren? → A: Los bonos son sugeridos por el sistema y aprobados por el supervisor. El bono de alimentación es un bono no sugerido (solo seleccionado manualmente por el supervisor); el bono de transporte sí es sugerido automáticamente por el sistema cuando se cumplen los criterios.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver elegibilidad de bonos en el desglose diario (Priority: P1)

El supervisor abre el desglose diario de un colaborador dentro de una liquidación semanal en curso y ve, para cada día del período, si el colaborador es elegible para bono de transporte según los criterios configurados. El bono de transporte elegible aparece marcado pero pendiente de confirmación. El bono de alimentación no es sugerido por el sistema; el supervisor lo puede agregar manualmente en cualquier día con marcación biométrica.

**Why this priority**: Sin visibilidad de la elegibilidad por día no hay base para confirmar ni rechazar bonos. Es el punto de entrada obligatorio del flujo de bonificaciones.

**Independent Test**: Se puede probar de forma aislada con un colaborador que tenga marcaciones en días distintos y verificando que los días donde se cumple al menos uno de los criterios configurados (horas mínimas trabajadas o turno en horario extremo) muestran el bono de transporte como elegible. Para el bono de alimentación, verificar que el supervisor puede agregarlo manualmente en cualquier día con marcación.

**Acceptance Scenarios**:

1. **Given** el colaborador trabajó el número mínimo de horas requerido un día, **When** el supervisor consulta su desglose diario, **Then** ese día muestra el bono de transporte como "elegible — pendiente de confirmar".
2. **Given** el colaborador tiene un turno que inicia antes de la hora límite de madrugada configurada (ej. antes de las 6:00 a.m.), **When** el supervisor consulta el desglose, **Then** ese día muestra el bono de transporte como elegible por criterio de horario extremo, aunque no haya trabajado el mínimo de horas.
3. **Given** el colaborador tiene un turno que termina después de la hora límite nocturna configurada (ej. después de las 9:00 p.m.), **When** el supervisor consulta el desglose, **Then** ese día también muestra el bono de transporte como elegible por criterio de horario extremo.
4. **Given** el colaborador estuvo ausente un día, **When** el supervisor consulta su desglose diario, **Then** ese día no muestra ningún bono elegible y el campo de bono de alimentación no puede ser activado manualmente.
5. **Given** el colaborador trabajó menos horas que el mínimo requerido y su turno no es de horario extremo, **When** el supervisor consulta el desglose, **Then** el bono de transporte aparece como "no elegible — criterios no cumplidos"; el supervisor puede agregar el bono de alimentación manualmente si el colaborador tiene marcación ese día.
6. **Given** el colaborador tiene marcación biométrica ese día, **When** el supervisor decide agregar el bono de alimentación, **Then** puede seleccionarlo y queda en estado "pendiente de confirmar".

---

### User Story 2 - Confirmar o rechazar bonos del día (Priority: P1)

El supervisor revisa los bonos marcados como elegibles (o los agrega manualmente en caso del bono de alimentación) para un día específico y confirma o rechaza cada uno individualmente. Al confirmar, el bono queda incluido en el total del día. Al rechazar, queda registrado con el motivo del rechazo para auditoría.

**Why this priority**: La confirmación manual es el control de negocio central; garantiza que ningún bono se pague sin revisión humana y cumple con el Principio VI de trazabilidad de la constitución.

**Independent Test**: Se puede probar confirmando el bono de transporte de un día y agregando+confirmando el bono de alimentación manualmente, luego verificando que el total del día refleja ambos bonos confirmados.

**Acceptance Scenarios**:

1. **Given** un bono de transporte está en estado "elegible — pendiente de confirmar", **When** el supervisor lo confirma, **Then** el bono queda en estado "confirmado" y su monto se suma al total del día.
2. **Given** el supervisor agrega manualmente el bono de alimentación en un día con marcación biométrica, **When** lo confirma, **Then** el bono de alimentación queda en estado "confirmado" y su monto se suma al total del día.
3. **Given** un bono está en estado "elegible — pendiente de confirmar", **When** el supervisor lo rechaza e ingresa un motivo, **Then** el bono queda en estado "rechazado" con el motivo registrado, y no suma al total del día.
4. **Given** el supervisor intenta rechazar un bono sin ingresar motivo, **When** intenta guardar, **Then** el sistema exige el campo de motivo antes de confirmar el rechazo.
5. **Given** un bono ya fue confirmado en un período no aprobado, **When** el supervisor necesita corregirlo, **Then** puede cambiar el estado de confirmado a rechazado (con nuevo motivo) mientras el período no esté aprobado.

---

### User Story 3 - Ver total diario con bonos incluidos (Priority: P1)

El desglose de cada día muestra el subtotal completo: horas trabajadas × tarifa efectiva + bono de transporte (si confirmado) + bono de alimentación (si confirmado). Este total diario es el insumo para el cálculo semanal de la liquidación.

**Why this priority**: El total diario con bonos es el valor fundamental para la liquidación; sin él el cálculo semanal es incompleto.

**Independent Test**: Se puede probar verificando que el total de un día con 8 horas a 15 Bs/hora más bono de transporte de 10 Bs y bono de alimentación de 8 Bs resulta en 138 Bs.

**Acceptance Scenarios**:

1. **Given** un día tiene 8 horas trabajadas a 15 Bs/hora y ambos bonos confirmados (10 Bs transporte + 8 Bs alimentación), **When** el sistema calcula el total del día, **Then** muestra 138 Bs (120 + 10 + 8).
2. **Given** un día tiene bono de transporte confirmado pero alimentación rechazada, **When** el sistema calcula el total, **Then** solo incluye el bono de transporte confirmado.
3. **Given** la liquidación semanal está en proceso, **When** el administrador ve el resumen semanal del colaborador, **Then** el total semanal es la suma de todos los totales diarios confirmados.

---

### User Story 4 - Configurar montos y criterios de bonos (Priority: P2)

El administrador configura para cada tipo de bono: el monto por día (en Bs). Para el bono de transporte, también configura los criterios mínimos de elegibilidad (mínimo de horas trabajadas o límites de horario extremo). El bono de alimentación solo requiere configuración de monto, sin criterios automáticos. Esta configuración puede hacerse a nivel de departamento con posibilidad de override por colaborador.

**Why this priority**: Sin configuración de montos y criterios, los cálculos no son determinísticos (viola Principio II y III de la constitución). Deben poderse cambiar sin tocar código.

**Independent Test**: Se puede probar cambiando el monto del bono de transporte de 10 Bs a 12 Bs y verificando que los días calculados a partir de ese cambio usan 12 Bs, mientras que períodos anteriores cerrados conservan 10 Bs.

**Acceptance Scenarios**:

1. **Given** el administrador cambia el monto del bono de transporte de un departamento, **When** guarda el cambio con fecha de vigencia, **Then** los períodos futuros usan el nuevo monto y los períodos pasados cerrados conservan el monto vigente en ese momento.
2. **Given** el administrador configura el criterio mínimo de horas para el bono de transporte en 6 horas, **When** un colaborador trabaja 5.5 horas un día sin horario extremo, **Then** el sistema lo marca como "no elegible — criterios no cumplidos" para ese bono.
3. **Given** el administrador define un override de monto de bono de alimentación para un colaborador específico diferente al de su departamento, **When** el supervisor agrega ese bono para ese colaborador, **Then** se usa su monto individual, no el del departamento.

---

### Edge Cases

- Si el colaborador cambia de departamento a mitad del período, se usa la configuración del departamento vigente al inicio del período (sábado). El nuevo departamento aplica desde el período siguiente.
- Los bonos no pueden confirmarse para días sin marcaciones biométricas. Una ausencia justificada no genera derecho a bonos de transporte ni alimentación.
- ¿Qué sucede si el monto del bono es 0 Bs? ¿Se trata como "no configurado" o como "confirmado en 0"?
- ¿Los bonos aplican en días festivos o solo en días laborables del horario asignado?

## Requirements *(mandatory)*

### Functional Requirements

**Desglose y elegibilidad**

- **FR-001**: Para cada día de un período de liquidación, el sistema DEBE calcular automáticamente si cada colaborador es elegible para el bono de transporte según los criterios configurados. El bono de alimentación NO es calculado automáticamente; el supervisor lo agrega manualmente. Si el departamento del colaborador no tiene configuración de bonos de transporte, el sistema DEBE mostrar el estado "no configurado" para ese colaborador y generar una advertencia visible en el resumen del período.
- **FR-002**: La elegibilidad para el bono de transporte se evalúa por dos criterios independientes (basta con cumplir uno): **(a) umbral de horas trabajadas** en el día ≥ mínimo configurado, o **(b) horario extremo**: la hora de entrada es anterior a un límite de madrugada configurado (ej. 06:00) o la hora de salida es posterior a un límite nocturno configurado (ej. 21:00). El bono de alimentación no tiene criterio de elegibilidad automático.
- **FR-003**: El bono de transporte puede tener sus propios umbrales de horas y horas límite de horario extremo, configurables por departamento con override individual. El bono de alimentación solo requiere que el colaborador tenga marcación biométrica ese día para poder ser agregado por el supervisor.
- **FR-004**: El sistema DEBE mostrar para cada día del desglose: estado del bono de transporte (elegible / no elegible / confirmado / rechazado), incluyendo qué criterio activó la elegibilidad (horas trabajadas o horario extremo) y el motivo si no es elegible; y estado del bono de alimentación (no agregado / pendiente de confirmar / confirmado / rechazado). Días sin marcación biométrica muestran ambos bonos como "no aplica".

**Confirmación y rechazo**

- **FR-005**: El supervisor DEBE poder confirmar o rechazar el bono de transporte (sugerido por el sistema) y agregar, confirmar o rechazar el bono de alimentación (selección manual) por día y por colaborador, mientras el período no esté aprobado. Cualquier acción sobre bonos requiere que el colaborador tenga al menos una marcación biométrica ese día; el sistema DEBE impedir confirmar o agregar bonos en días sin marcaciones.
- **FR-006**: El rechazo de un bono DEBE exigir un motivo de texto libre; no se permite rechazo sin justificación.
- **FR-007**: Toda confirmación, adición y rechazo de bono DEBE registrar: usuario (supervisor) que lo ejecutó, timestamp y motivo (en caso de rechazo). Cumplimiento del Principio VI.
- **FR-008**: Una vez aprobado el período de liquidación, los bonos quedan inmutables junto con el resto de la liquidación.

**Cálculo del total diario**

- **FR-009**: El total de un día DEBE calcularse como: (horas trabajadas × tarifa efectiva del día) + suma de bonos confirmados.
- **FR-010**: El sistema DEBE mostrar el desglose del total diario separando: subtotal de horas, bono de transporte y bono de alimentación.
- **FR-011**: El total diario confirmado DEBE alimentar directamente el cálculo del total semanal en la liquidación.

**Configuración**

- **FR-012**: Los montos de bono de transporte y de alimentación DEBEN ser configurables por departamento con posibilidad de override por colaborador individual.
- **FR-013**: Los criterios de elegibilidad del bono de transporte DEBEN ser configurables por departamento (con override individual) e incluir: umbral mínimo de horas trabajadas en el día, hora límite de entrada para turno madrugada y hora límite de salida para turno nocturno. El bono de alimentación no tiene criterios de elegibilidad automáticos; solo se configura su monto.
- **FR-014**: Cada cambio de configuración de montos o criterios DEBE guardarse con fecha de vigencia; los períodos pasados cerrados siempre usarán la configuración vigente en su momento.
- **FR-016**: Si un colaborador cambia de departamento durante un período activo, el sistema DEBE usar la configuración de bonos del departamento vigente al inicio de ese período (primer día del período). El nuevo departamento aplica a partir del período siguiente.
- **FR-015**: Solo el rol **administrador** puede configurar montos y criterios de bonos. El rol **supervisor** puede confirmar/rechazar el bono de transporte sugerido por el sistema y agregar/confirmar/rechazar el bono de alimentación en el desglose diario; el administrador también puede realizar estas acciones.

### Key Entities

- **Bono Diario**: Instancia de un bono para un colaborador en un día específico. El bono de transporte tiene estados (elegible / no_elegible / confirmado / rechazado) generados automáticamente por el sistema según criterios configurados. El bono de alimentación tiene estados (no_agregado / pendiente / confirmado / rechazado) y es creado exclusivamente por acción manual del supervisor; no existe elegibilidad automática para él.
- **Configuración de Bono**: Define para un departamento (o colaborador individual): tipo de bono, monto por día en Bs y criterios de elegibilidad — umbral mínimo de horas trabajadas en el día, hora límite de entrada para turno madrugada (ej. 06:00) y hora límite de salida para turno nocturno (ej. 21:00). Tiene fecha de vigencia.
- **Desglose Diario**: Resumen del día para un colaborador: horas trabajadas, tarifa efectiva, bonos aplicados y total; es el insumo para el cálculo semanal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El sistema determina automáticamente la elegibilidad de bonos para todos los días de un período en menos de 5 segundos al generar la liquidación.
- **SC-002**: El administrador puede revisar y confirmar/rechazar todos los bonos de un colaborador para una semana completa en menos de 3 minutos.
- **SC-003**: El total de un día calculado por el sistema coincide con el cálculo manual (horas × tarifa + bonos confirmados) en el 100% de los casos de prueba.
- **SC-004**: Cambiar el monto de un bono con nueva fecha de vigencia no altera ningún período cerrado anterior; el 100% de los períodos pasados conserva el monto vigente en su momento.
- **SC-005**: El 100% de los rechazos de bono tiene motivo registrado; ningún rechazo anónimo existe en el sistema.

## Assumptions

- El bono de transporte tiene dos criterios de elegibilidad automáticos independientes (OR): umbral de horas trabajadas en el día, o turno en horario extremo (entrada antes de hora límite de madrugada O salida después de hora límite nocturna). Basta con cumplir uno. El bono de alimentación no tiene criterios automáticos; es agregado manualmente por el supervisor.
- Los valores por defecto para el bono de transporte si no se configuran: umbral de horas = 6 h; hora límite de madrugada = 06:00; hora límite nocturna = 21:00. El administrador debe ajustar estos valores a la realidad del negocio antes del primer período.
- Ambos bonos tienen montos fijos por día en Bs (no son porcentajes); el monto es el mismo independientemente de las horas trabajadas ese día.
- Los bonos no aplican en días de ausencia total; si el colaborador no tiene eventos biométricos el día, ambos bonos son automáticamente "no elegible".
- Los bonos se calculan sobre días calendario del período; si un día festivo cae dentro del período, el administrador decide manualmente si confirma el bono (el sistema lo marcará como elegible si hay marcación).
- Un colaborador hereda la configuración de bono de su departamento, con posibilidad de que el administrador defina un valor individual diferente.
- La confirmación de bonos es parte del flujo de la liquidación semanal (spec 007); los bonos no se gestionan de forma independiente sino dentro del desglose del período.
- Los montos de ejemplo (bono transporte 10 Bs, bono alimentación 8 Bs) son ilustrativos; los valores reales se configuran antes de generar el primer período.
