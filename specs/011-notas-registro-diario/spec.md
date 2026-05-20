# Feature Specification: Notas y Adjuntos en el Registro Diario de Asistencia

**Feature Branch**: `011-notas-registro-diario`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Cada dia de registro biometrico por colaborador, permite registrar un comentario y adjuntar un documento (foto generalmente) como parte del control de asistencia."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar comentario en el desglose diario (Priority: P1)

El supervisor abre el desglose diario de un colaborador y escribe un comentario libre para un día específico: puede documentar una llegada tardía, una situación especial, una observación de turno o cualquier nota de contexto relevante para la asistencia de ese día.

**Why this priority**: El comentario de texto es la forma más rápida y básica de dejar constancia de situaciones que los datos biométricos solos no explican. Sin esta capacidad, el historial de asistencia carece de contexto para auditoría y liquidación.

**Independent Test**: Un supervisor puede abrir el desglose de un colaborador, escribir un comentario en un día con marcación biométrica y guardar. Al reabrir el desglose, el comentario aparece junto a los datos del día. Se verifica que el sistema registra quién lo escribió y cuándo.

**Acceptance Scenarios**:

1. **Given** un día con marcación biométrica, **When** el supervisor escribe un comentario y lo guarda, **Then** el comentario queda asociado al colaborador y al día, con registro del autor y timestamp.
2. **Given** un comentario guardado en un período no aprobado, **When** el supervisor lo edita, **Then** el sistema guarda la versión actualizada manteniendo registro de la modificación.
3. **Given** un período no aprobado, **When** el supervisor elimina el comentario de un día, **Then** el comentario desaparece del desglose; la acción queda registrada en auditoría.
4. **Given** un período ya aprobado, **When** cualquier usuario intenta modificar o eliminar un comentario, **Then** el sistema impide la acción y muestra que el período está cerrado.
5. **Given** un día sin ninguna marcación biométrica, **When** el supervisor intenta agregar un comentario, **Then** el sistema lo permite, ya que el comentario puede ser necesario para documentar ausencias justificadas u otros eventos del día.

---

### User Story 2 - Adjuntar documento al día (Priority: P1)

El supervisor adjunta un archivo (foto, imagen de documento o PDF) al desglose de un día de un colaborador para respaldar visualmente la nota de asistencia: una foto de permiso médico, una imagen de la puerta de entrada, una constancia escaneada, etc.

**Why this priority**: El adjunto visual es el respaldo que convierte el comentario en evidencia verificable. En el contexto de nómina y auditoría laboral, la foto o documento respalda decisiones sobre justificaciones, bonos y descuentos.

**Independent Test**: Un supervisor puede adjuntar una imagen JPEG al desglose de un día. El archivo queda guardado y puede ser visualizado o descargado por el supervisor y el administrador. Se verifica que el sistema valida tipo y tamaño del archivo antes de aceptarlo.

**Acceptance Scenarios**:

1. **Given** un día en el desglose de un colaborador, **When** el supervisor adjunta un archivo de tipo aceptado (JPEG, PNG, PDF) dentro del límite de tamaño, **Then** el archivo queda asociado al día y disponible para visualización.
2. **Given** un archivo adjunto ya guardado, **When** el supervisor adjunta uno nuevo para reemplazarlo en un período no aprobado, **Then** el nuevo archivo reemplaza al anterior y la acción queda registrada.
3. **Given** un archivo que supera el tamaño máximo permitido, **When** el supervisor intenta adjuntarlo, **Then** el sistema rechaza el archivo e informa el límite de tamaño.
4. **Given** un archivo de tipo no permitido (ej. `.exe`, `.zip`), **When** el supervisor intenta adjuntarlo, **Then** el sistema rechaza el archivo e informa los tipos aceptados.
5. **Given** un período ya aprobado, **When** cualquier usuario intenta reemplazar o eliminar un adjunto, **Then** el sistema impide la acción.

---

### User Story 3 - Consultar notas y adjuntos en el desglose (Priority: P1)

El supervisor o administrador revisa el desglose diario de un colaborador y ve de forma clara qué días tienen notas o adjuntos, pudiendo acceder al contenido de cada uno sin salir del desglose.

**Why this priority**: La consulta es el destino de todo lo registrado. Si la visualización no es clara e integrada en el desglose, el esfuerzo de registro tiene poco valor operativo.

**Independent Test**: Un supervisor puede identificar visualmente en el desglose qué días tienen nota o adjunto, leer el comentario completo y visualizar o descargar el archivo adjunto, todo dentro del mismo flujo de revisión de asistencia.

**Acceptance Scenarios**:

1. **Given** días con y sin notas en el desglose, **When** el supervisor abre el desglose, **Then** los días con nota o adjunto muestran un indicador visual diferenciado de los días sin anotación.
2. **Given** un día con comentario y adjunto, **When** el supervisor selecciona ese día, **Then** puede leer el comentario completo y visualizar o descargar el archivo adjunto.
3. **Given** un adjunto de tipo imagen, **When** el supervisor lo abre, **Then** la imagen se muestra directamente en la pantalla sin necesidad de descarga obligatoria.

---

### User Story 4 - Colaborador consulta sus propias notas (Priority: P2)

El colaborador accede a su propio historial de asistencia y puede ver los comentarios y adjuntos registrados por el supervisor en sus días de marcación, para conocer las observaciones que afectan su registro.

**Why this priority**: La transparencia con el colaborador es parte del principio de trazabilidad. Ver sus propias notas reduce disputas y permite al colaborador anticipar observaciones en su liquidación.

**Independent Test**: Un colaborador autenticado puede ver el desglose de su propia asistencia e identificar los días con notas, leer los comentarios y ver si hay adjuntos, sin poder modificar ninguno.

**Acceptance Scenarios**:

1. **Given** el colaborador autenticado consulta su historial, **When** abre el desglose de una semana, **Then** puede ver los comentarios del supervisor en sus días de marcación (solo lectura).
2. **Given** un día con adjunto visible, **When** el colaborador lo selecciona, **Then** puede visualizar el archivo pero no puede reemplazarlo ni eliminarlo.
3. **Given** el colaborador intenta modificar un comentario, **When** interactúa con el campo, **Then** el sistema no permite ninguna edición.

---

### Edge Cases

- ¿Se permite agregar nota o adjunto a un día sin marcación biométrica? → Sí, para documentar ausencias justificadas u otros eventos del día.
- ¿Qué sucede si el archivo adjunto se corrompe o el almacenamiento falla durante la carga? → El sistema informa el error y no guarda un adjunto incompleto; el desglose del día permanece sin adjunto.
- ¿Puede haber más de un adjunto por día? → No en v1: un archivo adjunto por día por colaborador, reemplazable mientras el período no esté aprobado.
- ¿Qué pasa si el comentario es muy largo? → El sistema acepta hasta 500 caracteres por comentario.
- ¿Los adjuntos son visibles para todos los supervisores o solo para el supervisor del área? → Solo para el supervisor del área del colaborador y el administrador; el colaborador ve los suyos propios.

## Requirements *(mandatory)*

### Functional Requirements

**Registro de comentarios**

- **FR-001**: El supervisor DEBE poder registrar un comentario de texto libre (máximo 500 caracteres) para cualquier día del desglose de un colaborador de su área, independientemente de si ese día tiene marcación biométrica o no.
- **FR-002**: El supervisor DEBE poder editar o eliminar un comentario propio mientras el período de liquidación al que pertenece el día no esté aprobado. Una vez aprobado el período, el comentario es inmutable.
- **FR-003**: Toda creación, edición o eliminación de comentario DEBE registrar: usuario que realizó la acción, timestamp y contenido anterior (en caso de edición o eliminación). Cumplimiento del Principio VI.

**Adjuntos**

- **FR-004**: El supervisor DEBE poder adjuntar un archivo por día por colaborador. Los tipos de archivo aceptados son: JPEG, PNG y PDF. El tamaño máximo por archivo es configurable por el administrador (valor por defecto: 10 MB).
- **FR-005**: El supervisor DEBE poder reemplazar el archivo adjunto de un día mientras el período no esté aprobado. El archivo anterior se conserva en el registro de auditoría aunque ya no sea el adjunto activo.
- **FR-006**: El sistema DEBE validar el tipo y tamaño del archivo antes de aceptarlo e informar al usuario con un mensaje claro si el archivo no cumple los criterios.
- **FR-007**: Una vez aprobado el período, los adjuntos son inmutables: no se pueden reemplazar ni eliminar.

**Visualización y acceso**

- **FR-008**: El desglose diario DEBE mostrar un indicador visual en cada día que tenga comentario y/o adjunto, distinguible de los días sin anotación.
- **FR-009**: El supervisor y el administrador DEBEN poder leer el comentario completo y visualizar o descargar el adjunto directamente desde el desglose diario.
- **FR-010**: Las imágenes adjuntas (JPEG, PNG) DEBEN poder visualizarse en pantalla sin descarga obligatoria. Los PDF se descargan.
- **FR-011**: El colaborador DEBE poder ver (solo lectura) los comentarios y adjuntos de sus propios días en su historial de asistencia personal.

**Control de acceso**

- **FR-012**: Solo el supervisor asignado al área del colaborador y el administrador pueden crear, editar o eliminar notas y adjuntos. El colaborador tiene acceso de solo lectura a los suyos.
- **FR-013**: El supervisor no puede ver ni modificar notas y adjuntos de colaboradores de áreas distintas a la suya.

### Key Entities

- **Nota de Asistencia**: Registro asociado a un colaborador y a una fecha específica; contiene un comentario de texto (opcional, máx. 500 caracteres), referencia al archivo adjunto activo (opcional), autor, timestamp de creación y timestamp de última modificación.
- **Adjunto de Asistencia**: Archivo vinculado a una Nota de Asistencia; tiene nombre original, tipo MIME, tamaño, ubicación en almacenamiento y estado (activo / reemplazado). Los adjuntos reemplazados se conservan para auditoría.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El supervisor puede registrar un comentario y adjuntar un archivo a un día del desglose en menos de 60 segundos.
- **SC-002**: El 100% de las notas y adjuntos registrados muestran autor y timestamp; ninguna anotación anónima existe en el sistema.
- **SC-003**: Los archivos que superan el tamaño máximo o tienen tipo no permitido son rechazados en el 100% de los casos con mensaje de error claro antes de intentar la carga.
- **SC-004**: Una vez aprobado un período, el 100% de los intentos de modificar notas o adjuntos de ese período son bloqueados por el sistema.
- **SC-005**: El colaborador puede acceder a sus propias notas históricas en menos de 10 segundos desde que abre su historial.

## Assumptions

- Un solo adjunto por día por colaborador en v1; la posibilidad de múltiples adjuntos queda para versiones futuras.
- El almacenamiento de archivos adjuntos utiliza el servicio de almacenamiento provisto por la plataforma de base de datos (Supabase Storage); el tamaño máximo configurable tiene un límite superior determinado por la capacidad del plan contratado.
- Los tipos de archivo aceptados en v1 son JPEG, PNG y PDF; otros formatos (audio, video, documentos de oficina) quedan fuera del alcance.
- El comentario de texto y el adjunto son independientes: se puede tener uno sin el otro.
- Las notas de asistencia son parte del flujo de revisión de la liquidación semanal (spec 007) pero no afectan directamente el cálculo de horas ni bonos; son información contextual y de auditoría.
- El límite de 500 caracteres para el comentario es suficiente para las anotaciones operativas del día; textos más extensos corresponden a justificaciones formales gestionadas en otro flujo.
- La visibilidad de adjuntos entre supervisores de distintas áreas está restringida para proteger la privacidad del colaborador.
