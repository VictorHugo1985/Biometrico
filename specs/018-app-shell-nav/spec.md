# Feature Specification: App Shell y Navegación Principal

**Feature Branch**: `018-app-shell-nav`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "La aplicacion web tiene que ser accedida desde una vista general que liste los accesos a las distintas historias de usuario y especificaciones indicadas. Uno de los elementos que tiene que tener en el sidebar es el acceso al Dashboard (vista inicial al acceder a la app)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acceso al Dashboard como Vista Inicial (Priority: P1)

Al ingresar a la aplicación con sesión activa, el usuario aterriza directamente en el Dashboard de asistencia sin necesidad de pasos adicionales. El Dashboard muestra el resumen de asistencia en tiempo real.

**Why this priority**: El Dashboard es el punto de entrada principal; cualquier usuario autenticado necesita este flujo para operar el sistema.

**Independent Test**: Puede probarse abriendo la URL raíz de la app con sesión activa y verificando que se muestra el Dashboard.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado accede a la URL raíz, **When** la página carga, **Then** se muestra el Dashboard de asistencia como vista activa con el ítem "Dashboard" resaltado en el sidebar.
2. **Given** un usuario no autenticado accede a cualquier ruta de la app, **When** la página carga, **Then** es redirigido a la pantalla de inicio de sesión.
3. **Given** un usuario autenticado, **When** hace clic en "Dashboard" en el sidebar, **Then** navega al Dashboard sin recargar la página completa.

---

### User Story 2 - Navegación por Sidebar (Priority: P1)

El usuario tiene un sidebar persistente visible en todas las vistas autenticadas. El sidebar muestra los módulos a los que el rol del usuario tiene acceso. Al hacer clic en un ítem, navega a esa sección y el ítem queda marcado como activo.

**Why this priority**: La navegación lateral es el mecanismo principal de movimiento entre módulos; sin ella el sistema no es operable.

**Independent Test**: Puede probarse verificando que todos los ítems del sidebar navegan a sus secciones correspondientes sin recarga completa, y que el ítem activo se resalta correctamente.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado está en cualquier vista, **When** el sidebar está visible, **Then** muestra únicamente los módulos permitidos para su rol.
2. **Given** un usuario hace clic en un ítem del sidebar, **When** la navegación ocurre, **Then** la URL cambia, el contenido principal se actualiza y el ítem seleccionado queda resaltado como activo.
3. **Given** un usuario Administrador, **When** ve el sidebar, **Then** tiene acceso a todos los módulos: Dashboard, Colaboradores, Liquidación Semanal, Bonos Diarios, Notas de Registro, Pago por Caja, Configuración del Sistema, Justificaciones, Gestión de Usuarios, Reportes e Ingesta Biométrica.
4. **Given** un usuario Supervisor, **When** ve el sidebar, **Then** tiene acceso a: Dashboard, Colaboradores (lectura), Justificaciones, Notas de Registro, Bonos Diarios.
5. **Given** un usuario Caja, **When** ve el sidebar, **Then** tiene acceso a: Pago por Caja únicamente.
6. **Given** un usuario Colaborador, **When** ve el sidebar, **Then** tiene acceso a: su propio historial de asistencia y estado de pago.

---

### User Story 3 - Vista General de Módulos (Priority: P2)

El usuario accede a una vista de índice general (Home) que presenta de forma visual todos los módulos disponibles para su rol, con una descripción breve de cada uno y un acceso directo. Esta vista sirve como directorio de la aplicación.

**Why this priority**: Facilita la orientación del usuario nuevo y el acceso rápido a módulos poco frecuentes; el sistema puede operar sin ella usando solo el sidebar.

**Independent Test**: Puede probarse navegando a la ruta `/home` y verificando que se listan las tarjetas de módulos accesibles para el rol actual.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado navega a la vista Home, **When** la página carga, **Then** se muestran tarjetas o secciones para cada módulo accesible según su rol.
2. **Given** un usuario hace clic en una tarjeta de módulo en la vista Home, **When** navega, **Then** llega a esa sección de la aplicación.
3. **Given** un usuario Administrador en la vista Home, **When** la página carga, **Then** se listan todos los módulos del sistema con nombre y descripción funcional breve.

---

### User Story 4 - Sidebar Colapsable en Móvil (Priority: P3)

En dispositivos móviles el sidebar está oculto por defecto y se puede abrir/cerrar mediante un botón de menú (hamburger). En escritorio el sidebar está siempre visible.

**Why this priority**: La constitución requiere diseño mobile-first; el sidebar en pantalla completa bloquearía el contenido en móvil.

**Independent Test**: Puede probarse redimensionando el navegador a viewport móvil (320px) y verificando que el sidebar se oculta y puede abrirse con el botón de menú.

**Acceptance Scenarios**:

1. **Given** un usuario accede desde un viewport menor a 768 px, **When** la página carga, **Then** el sidebar está oculto y un botón de menú es visible en la barra superior.
2. **Given** un usuario en móvil toca el botón de menú, **When** el sidebar se abre, **Then** ocupa la pantalla como drawer y el contenido principal queda cubierto (no desplazado).
3. **Given** un usuario en móvil con el sidebar abierto selecciona un ítem, **When** navega, **Then** el sidebar se cierra automáticamente.
4. **Given** un usuario accede desde un viewport mayor a 768 px, **When** la página carga, **Then** el sidebar está siempre visible y no hay botón de hamburger.

---

### Edge Cases

- ¿Qué ocurre si el usuario accede a una ruta que no existe? → Se muestra una página 404 con enlace al Dashboard.
- ¿Qué ocurre si el token de sesión expira mientras el usuario navega? → Se redirige a la pantalla de inicio de sesión manteniendo la ruta intentada para redirigir post-login.
- ¿Qué ocurre si un usuario intenta acceder manualmente a una ruta fuera de su rol? → Se muestra una pantalla de acceso denegado (403) con enlace al Dashboard.
- ¿Qué pasa si el sidebar tiene demasiados ítems para la altura de pantalla en móvil? → Los ítems son scrolleables dentro del drawer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La aplicación DEBE mostrar el Dashboard de asistencia como vista por defecto al acceder a la URL raíz con sesión activa.
- **FR-002**: La aplicación DEBE tener un sidebar de navegación persistente visible en todas las vistas autenticadas.
- **FR-003**: El sidebar DEBE incluir un ítem "Dashboard" que navega a la vista de asistencia en tiempo real.
- **FR-004**: El sidebar DEBE mostrar únicamente los módulos a los que el rol del usuario autenticado tiene permiso de acceso (filtrado RBAC).
- **FR-005**: La navegación entre módulos DEBE ocurrir sin recarga completa de la página (SPA navigation).
- **FR-006**: El ítem del sidebar correspondiente a la vista activa DEBE estar visualmente resaltado.
- **FR-007**: La aplicación DEBE incluir una vista de índice general (Home) que liste con tarjetas los módulos accesibles para el rol del usuario.
- **FR-008**: En viewports menores a 768 px, el sidebar DEBE estar oculto por defecto y abrirse como drawer lateral mediante un botón de menú.
- **FR-009**: Al seleccionar un ítem del sidebar en vista móvil, el drawer DEBE cerrarse automáticamente.
- **FR-010**: Un usuario no autenticado DEBE ser redirigido a la pantalla de inicio de sesión al acceder a cualquier ruta protegida.
- **FR-011**: Un usuario que accede a una ruta fuera de su rol DEBE ver una pantalla de acceso denegado con enlace al Dashboard.
- **FR-012**: Una ruta inexistente DEBE mostrar una página de error con enlace al Dashboard.

### Key Entities

- **Módulo**: Sección funcional de la aplicación (Dashboard, Colaboradores, Liquidación, etc.) con nombre, descripción, ruta y roles permitidos.
- **Ítem de Navegación**: Representación visual de un módulo en el sidebar; tiene estado activo/inactivo según la ruta actual.
- **Rol de Usuario**: Uno de los cuatro roles fijos del sistema (Administrador, Supervisor, Caja, Colaborador) que determina los módulos visibles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario autenticado llega al Dashboard en menos de 2 segundos desde que accede a la URL raíz de la aplicación.
- **SC-002**: Toda navegación entre módulos vía sidebar no supera 1 segundo de tiempo de transición perceptible.
- **SC-003**: En viewport móvil (320 px), todos los ítems del sidebar son accesibles y utilizables con interacción táctil sin necesidad de zoom.
- **SC-004**: El 100% de las rutas con restricción de rol bloquean el acceso a usuarios sin el rol requerido.
- **SC-005**: La vista Home lista el 100% de los módulos permitidos para el rol activo sin omisiones.
- **SC-006**: La aplicación no expone rutas de escritura accesibles sin sesión activa.

## Assumptions

- La autenticación y gestión de sesión (JWT) está implementada por la especificación 004 (user-auth-login); este feature reutiliza ese mecanismo.
- Los cuatro roles fijos del sistema están definidos en la especificación 015 (gestión de usuarios); este feature consume la información de rol del token de sesión.
- Los módulos del sistema ya están definidos en las especificaciones 006–016; la navegación los enlaza pero no reimplementa su funcionalidad.
- El soporte para múltiples idiomas queda fuera del alcance de v1; la interfaz es en español.
- Notificaciones en tiempo real (ej. alertas de asistencia) quedan fuera del alcance de esta especificación; pertenecen a la spec del Dashboard (008).
- La aplicación corre como SPA (Single Page Application) en un navegador moderno; no se requiere soporte para IE o navegadores sin JS.
