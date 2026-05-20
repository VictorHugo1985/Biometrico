# Feature Specification: Dashboard de Asistencia en Fábrica

**Feature Branch**: `008-dashboard-asistencia`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "Se requiere un dashboard que muestre el personal en fábrica, de las distintas áreas y también los que no han asistido. Permitiendo rápidamente acceder al registro biométrico del día de cualquier colaborador."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver estado de asistencia del día por área (Priority: P1)

El administrador o supervisor abre el dashboard y ve de un vistazo cuántas personas están presentes en la fábrica, organizadas por área. Las personas ausentes también aparecen claramente identificadas. No necesita buscar ni navegar: toda la información del día está en una sola pantalla.

**Why this priority**: Es la necesidad operativa diaria más crítica: saber en tiempo real quién está y quién falta. Sin este dato no se puede reaccionar a ausencias ni tomar decisiones de operación.

**Independent Test**: Se puede probar de forma aislada con colaboradores registrados y eventos biométricos del día, verificando que cada colaborador aparece en su área con el estado correcto (presente/ausente).

**Acceptance Scenarios**:

1. **Given** existen colaboradores activos con eventos biométricos del día, **When** el usuario accede al dashboard, **Then** ve a cada colaborador bajo el nombre de su área, con indicación visual de si está presente o ausente.
2. **Given** un colaborador no tiene ningún evento biométrico registrado hoy, **When** el usuario consulta el dashboard, **Then** ese colaborador aparece en la sección de ausentes de su área.
3. **Given** el dashboard está abierto, **When** transcurren 30 segundos sin interacción, **Then** la información se actualiza automáticamente reflejando los últimos eventos recibidos.
4. **Given** el dashboard está abierto, **When** llega un nuevo evento biométrico de un colaborador marcado como ausente, **Then** al próximo refresco ese colaborador aparece como presente.

---

### User Story 2 - Consultar registro biométrico del día de un colaborador (Priority: P1)

Con un solo clic sobre cualquier colaborador visible en el dashboard, el usuario accede al detalle de todos sus eventos biométricos del día: hora exacta de cada marcación, tipo de verificación y dispositivo utilizado.

**Why this priority**: Cuando se detecta una anomalía (ausencia inesperada, llegada tardía, salida temprana), el supervisor necesita acceder al registro individual en segundos para confirmar o descartar el problema.

**Independent Test**: Se puede probar de forma aislada seleccionando un colaborador con múltiples eventos del día y verificando que se muestran todas las marcaciones en orden cronológico.

**Acceptance Scenarios**:

1. **Given** el usuario ve un colaborador en el dashboard, **When** hace clic sobre él, **Then** se muestra el detalle con la hora de cada marcación del día, el tipo de verificación (ej. Huella Digital) y el nombre del dispositivo.
2. **Given** el usuario consulta el detalle de un colaborador ausente, **When** accede a su ficha del día, **Then** el sistema confirma que no hay eventos registrados y muestra el horario esperado para contextualizar la ausencia.
3. **Given** el usuario está en el detalle de un colaborador, **When** cierra el panel, **Then** vuelve al dashboard general sin perder el estado de la vista (área seleccionada, filtros activos).

---

### User Story 3 - Filtrar y buscar colaboradores en el dashboard (Priority: P2)

El usuario puede buscar a un colaborador específico por nombre o filtrar la vista para ver solo un área determinada, reduciendo el tiempo para encontrar a alguien en fábricas con muchos colaboradores.

**Why this priority**: A medida que crece el número de colaboradores, el dashboard completo puede volverse difícil de leer. La búsqueda/filtro hace que la herramienta escale sin perder usabilidad.

**Independent Test**: Se puede probar filtrando por área y verificando que solo aparecen los colaboradores de esa área, con sus estados correctos.

**Acceptance Scenarios**:

1. **Given** el usuario escribe parte del nombre de un colaborador en el buscador, **When** el texto tiene al menos 2 caracteres, **Then** el dashboard muestra solo los colaboradores que coinciden con la búsqueda, con su estado del día.
2. **Given** el usuario selecciona un área específica del filtro, **When** aplica el filtro, **Then** el dashboard muestra solo los colaboradores de esa área, manteniendo el desglose presente/ausente.
3. **Given** el usuario aplica un filtro de área, **When** lo elimina, **Then** el dashboard regresa a mostrar todas las áreas.

---

### User Story 4 - Ver resumen global de asistencia (Priority: P2)

Al tope del dashboard se muestra un resumen con los números clave del día: total de colaboradores activos esperados, cuántos están presentes y cuántos están ausentes, con el porcentaje de asistencia.

**Why this priority**: Los administradores necesitan el dato global en segundos sin tener que contar manualmente. Es la métrica de operación diaria más consultada por dirección.

**Independent Test**: Se puede probar verificando que el total de presentes + ausentes = total de colaboradores activos con horario asignado para el día.

**Acceptance Scenarios**:

1. **Given** el dashboard está activo, **When** el usuario lo ve, **Then** el encabezado muestra: total esperado hoy, total presentes, total ausentes y porcentaje de asistencia.
2. **Given** el resumen muestra 10 presentes y 3 ausentes, **When** el usuario revisa el detalle por área, **Then** la suma de presentes y ausentes por área coincide con el resumen global.

---

### Edge Cases

- ¿Qué ocurre si un colaborador tiene evento de entrada pero no de salida del día anterior (turno nocturno que cruza medianoche)?
- ¿Cómo se muestra un colaborador sin área asignada?
- ¿Qué pasa si un colaborador tiene horario asignado para días específicos y hoy no le corresponde trabajar — aparece como ausente?
- ¿Qué ocurre si no hay ningún colaborador activo registrado en el sistema?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El dashboard DEBE mostrar a todos los colaboradores activos agrupados por área, con indicación visual clara del estado de cada uno: presente o ausente.
- **FR-002**: El sistema DEBE determinar "presente" a todo colaborador con al menos un evento biométrico registrado en el día calendario actual (zona horaria Colombia COT).
- **FR-003**: El sistema DEBE determinar "ausente" a todo colaborador activo sin ningún evento biométrico en el día actual, siempre que tenga horario asignado que incluya ese día.
- **FR-004**: El dashboard DEBE mostrar un resumen global al tope: total esperado hoy, total presentes, total ausentes y porcentaje de asistencia.
- **FR-005**: El dashboard DEBE mostrar un resumen por área: nombre del área, cantidad de presentes y cantidad de ausentes.
- **FR-006**: Al seleccionar un colaborador, el sistema DEBE mostrar el detalle de sus eventos biométricos del día: hora de cada marcación, tipo de verificación y nombre del dispositivo, en orden cronológico.
- **FR-007**: Si un colaborador no tiene eventos del día, el panel de detalle DEBE indicarlo explícitamente y mostrar su horario esperado.
- **FR-008**: El dashboard DEBE actualizarse automáticamente cada 30 segundos sin requerir acción del usuario.
- **FR-009**: El sistema DEBE permitir buscar colaboradores por nombre o apellido desde el dashboard.
- **FR-010**: El sistema DEBE permitir filtrar el dashboard para mostrar solo una área específica.
- **FR-011**: Los roles **administrador** y **supervisor** DEBEN poder acceder al dashboard; el rol **colaborador** NO tiene acceso.
- **FR-012**: El dashboard DEBE ser accesible desde dispositivos móviles y de escritorio sin pérdida de información.

### Key Entities

- **Estado de Asistencia del Día**: Vista derivada por colaborador para la fecha actual: presente (con primera marcación) o ausente (sin marcaciones). Incluye hora de primera entrada si está presente.
- **Registro Biométrico del Día**: Todos los eventos biométricos de un colaborador en la fecha actual, ordenados cronológicamente, con hora, tipo de verificación y dispositivo.
- **Resumen por Área**: Conteo de colaboradores presentes y ausentes agrupados por departamento/área para el día actual.
- **Resumen Global**: Totales del día: esperados, presentes, ausentes y porcentaje de asistencia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El dashboard carga con el estado completo de todos los colaboradores activos en menos de 3 segundos.
- **SC-002**: El detalle biométrico de cualquier colaborador es accesible con un máximo de 2 interacciones (clic) desde el dashboard principal.
- **SC-003**: El dashboard refleja nuevos eventos biométricos en un máximo de 30 segundos sin que el usuario recargue la página.
- **SC-004**: El 100% de los colaboradores activos con horario del día aparece en el dashboard, ya sea como presente o ausente; ningún colaborador queda omitido.
- **SC-005**: La búsqueda por nombre devuelve resultados en menos de 1 segundo con hasta 200 colaboradores registrados.
- **SC-006**: El dashboard es usable en pantallas de 5 pulgadas (móvil) sin desplazamiento horizontal.

## Assumptions

- "Personal en fábrica" se interpreta como colaboradores con al menos un evento biométrico de entrada registrado el día actual en zona horaria COT (América/Bogotá).
- Un colaborador sin horario asignado no aparece en la columna de ausentes (no se espera que esté); solo figuran como esperados quienes tienen horario para ese día.
- Si un colaborador no tiene área asignada, aparece bajo una sección "Sin área asignada" en el dashboard.
- El dashboard muestra únicamente el día actual; la consulta de días anteriores se realiza desde el módulo de registros biométricos históricos (fuera del alcance de esta especificación).
- Los roles administrador y supervisor ven todas las áreas; no hay restricción por área para supervisores en esta versión.
- El refresco automático de 30 segundos es suficiente para operación de fábrica; no se requiere actualización en tiempo real instantáneo.
- El acceso al dashboard requiere autenticación previa; el módulo de autenticación es una dependencia externa (spec 004).
- El dashboard DEBE ser completamente funcional en dispositivos móviles (Principio VIII de la constitución v1.2.0): la vista de áreas y conteos debe ser legible en pantalla de teléfono; el detalle de colaborador se muestra en panel deslizante o página separada, no en tabla anidada.
