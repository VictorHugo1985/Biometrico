# Feature Specification: Gestión de Colaboradores

**Feature Branch**: `006-gestion-colaboradores`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "el administrador puede gestionar los colaboradores, asignadoles el perfil de tarifa correspondiente, sus horarios, y el area en la que trabaja, ademas de el workno asignado en el biometrico"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar nuevo colaborador (Priority: P1)

El administrador registra a un nuevo empleado en el sistema ingresando sus datos personales y asignándole desde el inicio el área de trabajo, el perfil de tarifa salarial, el horario laboral y el código de empleado (workno) que tiene configurado en el dispositivo biométrico.

**Why this priority**: Sin este registro, los eventos biométricos del empleado quedan sin vincular y no se puede calcular su nómina. Es el punto de entrada obligatorio para toda la operación del sistema.

**Independent Test**: Se puede probar de forma aislada creando un colaborador completo y verificando que los webhooks entrantes con ese workno quedan en estado "procesado" en lugar de "fallido".

**Acceptance Scenarios**:

1. **Given** el administrador está en el módulo de colaboradores, **When** completa el formulario con nombre, apellido, workno, área, perfil de tarifa y horario y confirma, **Then** el colaborador queda registrado como activo y aparece en el listado.
2. **Given** el administrador intenta registrar un workno que ya está asignado a otro colaborador activo, **When** intenta guardar, **Then** el sistema rechaza el registro y le indica el conflicto.
3. **Given** el administrador omite el perfil de tarifa o el horario, **When** intenta guardar, **Then** el sistema le informa que ambos campos son obligatorios.

---

### User Story 2 - Editar datos y asignaciones del colaborador (Priority: P2)

El administrador modifica los datos de un colaborador existente: puede actualizar su nombre, su área de trabajo, cambiarle el perfil de tarifa, cambiarle el horario asignado, o corregir el workno.

**Why this priority**: Las condiciones laborales cambian (ascensos, traslados de área, cambios de turno). Sin esta capacidad la información queda desactualizada y afecta el cálculo de nómina.

**Independent Test**: Se puede probar cambiando el área de un colaborador existente y verificando que el cambio queda reflejado inmediatamente en su ficha.

**Acceptance Scenarios**:

1. **Given** existe un colaborador activo, **When** el administrador cambia su perfil de tarifa y guarda, **Then** el nuevo perfil queda asignado y el anterior deja de estar vigente.
2. **Given** existe un colaborador activo, **When** el administrador cambia el horario asignado, **Then** el nuevo horario queda vinculado al colaborador.
3. **Given** el administrador intenta asignar un workno que ya pertenece a otro colaborador activo, **When** intenta guardar, **Then** el sistema rechaza el cambio y muestra el conflicto.

---

### User Story 3 - Consultar listado de colaboradores (Priority: P2)

El administrador consulta el listado de todos los colaboradores activos e inactivos, pudiendo filtrar por área, estado (activo/inactivo) o buscar por nombre o workno.

**Why this priority**: El administrador necesita visibilidad del estado actual de la plantilla para auditorías, planificación de nómina y resolución de eventos sin vincular.

**Independent Test**: Se puede probar de forma aislada con datos existentes, filtrando por área y verificando que solo aparecen los colaboradores de esa área.

**Acceptance Scenarios**:

1. **Given** existen colaboradores registrados, **When** el administrador accede al listado, **Then** ve nombre, apellido, workno, área, perfil de tarifa y horario de cada uno.
2. **Given** el administrador aplica un filtro por área, **When** confirma el filtro, **Then** el listado muestra solo colaboradores de esa área.
3. **Given** el administrador busca por workno parcial o nombre, **When** ingresa el texto de búsqueda, **Then** el listado se reduce a los colaboradores que coinciden.

---

### User Story 4 - Dar de baja a un colaborador (Priority: P3)

El administrador desactiva a un colaborador que ya no trabaja en la organización. El colaborador queda inactivo y sus datos históricos (eventos biométricos, nóminas previas) se conservan íntegros.

**Why this priority**: Necesario para mantener la integridad del sistema; los eventos de un colaborador dado de baja no deben procesarse, pero su historial debe conservarse para auditoría.

**Independent Test**: Se puede probar dando de baja a un colaborador y verificando que los webhooks subsiguientes con ese workno quedan marcados como rechazados/fallidos en lugar de procesados.

**Acceptance Scenarios**:

1. **Given** existe un colaborador activo, **When** el administrador lo da de baja y confirma, **Then** el colaborador queda en estado inactivo y ya no aparece en el listado activo por defecto.
2. **Given** un colaborador ha sido dado de baja, **When** se recibe un evento biométrico con su workno, **Then** el evento se registra con estado fallido indicando que el colaborador está inactivo.
3. **Given** un colaborador inactivo, **When** el administrador accede a su ficha, **Then** puede ver todo su historial pero no puede asignarle nuevos perfiles o horarios sin reactivarlo.

---

### Edge Cases

- ¿Qué pasa si se intenta dar de baja a un colaborador con nóminas pendientes de cerrar?
- ¿Cómo se maneja el cambio de workno cuando el dispositivo biométrico fue reemplazado?
- ¿Qué ocurre si se asigna un perfil de tarifa que fue desactivado?
- ¿Puede un colaborador ser transferido temporalmente a otra área (comisión)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir al administrador crear un colaborador con nombre, apellido, fecha de ingreso, workno, área de trabajo, perfil de tarifa y horario laboral como campos obligatorios.
- **FR-002**: El sistema DEBE garantizar que el workno es único entre todos los colaboradores activos.
- **FR-003**: El sistema DEBE permitir al administrador asignar o cambiar el perfil de tarifa de un colaborador en cualquier momento.
- **FR-004**: El sistema DEBE permitir al administrador asignar o cambiar el horario laboral de un colaborador en cualquier momento.
- **FR-005**: El sistema DEBE permitir al administrador asignar o cambiar el área (departamento) de un colaborador.
- **FR-006**: El sistema DEBE permitir al administrador modificar el workno de un colaborador, siempre que el nuevo workno no esté en uso por otro colaborador activo.
- **FR-007**: El sistema DEBE permitir buscar colaboradores por nombre, apellido o workno.
- **FR-008**: El sistema DEBE permitir filtrar el listado de colaboradores por área y por estado (activo/inactivo).
- **FR-009**: El sistema DEBE permitir al administrador dar de baja a un colaborador (desactivación lógica), conservando todo su historial.
- **FR-010**: El sistema DEBE impedir asignar un perfil de tarifa o un horario que esté desactivado.
- **FR-011**: El sistema NO DEBE permitir eliminar físicamente registros de colaboradores.
- **FR-012**: El sistema DEBE registrar quién realizó cada cambio sobre un colaborador y en qué momento.

### Key Entities

- **Colaborador**: Empleado de la organización; tiene nombre, apellido, fecha de ingreso, estado activo/inactivo, y está vinculado a un área, un perfil de tarifa, un horario y un workno.
- **Workno**: Código de empleado configurado en el dispositivo biométrico CrossChex; identifica al colaborador en los eventos de marcación.
- **Área / Departamento**: Unidad organizativa donde trabaja el colaborador (ej. "Rosa Betania", "Administración").
- **Perfil de Tarifa**: Estructura salarial o tarifaria que define cómo se calcula la remuneración del colaborador (tipo de contrato, valor hora, recargos).
- **Horario Laboral**: Definición de los días y horas de trabajo asignados al colaborador (entrada, salida, días laborables).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador puede registrar un colaborador completo con todas sus asignaciones en menos de 3 minutos.
- **SC-002**: Tras registrar un colaborador, los eventos biométricos con su workno quedan en estado "procesado" en el 100% de los casos (asumiendo workno y dispositivo registrados).
- **SC-003**: El administrador puede localizar cualquier colaborador por nombre o workno en menos de 10 segundos.
- **SC-004**: El 100% de los colaboradores activos tiene perfil de tarifa y horario asignados antes de que se inicie el cálculo de nómina.
- **SC-005**: Los cambios de área, tarifa u horario quedan reflejados en el sistema de forma inmediata, sin intervención técnica.

## Assumptions

- Solo el rol **administrador** puede crear, editar o dar de baja colaboradores; el rol **supervisor** puede consultar el listado pero no modificar.
- Los perfiles de tarifa y los horarios son entidades que ya existen o se crearán en módulos separados; esta especificación cubre solo la asignación al colaborador.
- Un colaborador tiene exactamente un perfil de tarifa activo y un horario activo en un momento dado.
- El workno es el mismo valor que el campo `employee.workno` que envía CrossChex en el payload del webhook.
- La baja de un colaborador es lógica (campo `activo = false`); no se eliminan registros físicamente.
- El correo electrónico del colaborador es opcional en el registro inicial.
- El sistema opera en un único tenant (una sola organización); no hay aislamiento multi-empresa.
- Todas las vistas de gestión de colaboradores deben ser funcionales en dispositivos móviles (Principio VIII de la constitución v1.2.0): formularios en columna única, tablas que colapsan a tarjetas en pantallas pequeñas.
