# Feature Specification: Gestión de Usuarios y Roles

**Feature Branch**: `015-gestion-usuarios`

**Created**: 2026-05-20

**Status**: Draft

**Input**: Prerequisito identificado en revisión de backlog: el administrador necesita poder crear y gestionar las cuentas de acceso de supervisores, cajeros y colaboradores para que el sistema de control de roles funcione correctamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear cuenta de usuario (Priority: P1)

El administrador crea una cuenta de acceso para un nuevo supervisor, cajero o colaborador del sistema. Asigna el rol correspondiente, vincula la cuenta al registro del colaborador si aplica, y define la contraseña inicial.

**Why this priority**: Sin cuentas de usuario activas, ningún rol puede operar el sistema. Es el prerequisito de acceso para todos los demás flujos.

**Independent Test**: El administrador crea una cuenta para un supervisor con su correo y rol. El supervisor puede iniciar sesión con la contraseña inicial y accede exclusivamente a las funciones de su rol.

**Acceptance Scenarios**:

1. **Given** el administrador accede a la gestión de usuarios, **When** crea una cuenta con correo, rol y contraseña inicial, **Then** la cuenta queda activa y el usuario puede iniciar sesión inmediatamente.
2. **Given** el administrador crea una cuenta para un colaborador, **When** la vincula al registro de colaborador existente, **Then** el colaborador puede acceder a su historial personal usando esa cuenta.
3. **Given** el administrador intenta crear una cuenta con un correo ya registrado, **When** intenta guardar, **Then** el sistema rechaza el duplicado e informa que el correo ya está en uso.
4. **Given** el administrador crea una cuenta con rol "colaborador" sin vincularla a un registro de colaborador, **When** guarda, **Then** el sistema advierte que la cuenta no tiene acceso a datos de asistencia hasta que se vincule.
5. **Given** el administrador no ingresa contraseña inicial, **When** intenta guardar la cuenta, **Then** el sistema genera una contraseña temporal y la muestra una única vez para que el administrador la entregue al usuario.

---

### User Story 2 - Editar rol y datos de una cuenta (Priority: P1)

El administrador puede cambiar el rol de un usuario existente, actualizar su correo o cambiar su vinculación a un registro de colaborador, cuando la responsabilidad del usuario cambia dentro de la organización.

**Why this priority**: Los cambios de rol son inevitables en la operación (un colaborador pasa a supervisor, un cajero cambia de función). Sin esta capacidad el administrador tendría que crear cuentas nuevas y eliminar las viejas.

**Independent Test**: El administrador cambia el rol de una cuenta de "colaborador" a "supervisor". Al iniciar sesión, ese usuario ve la vista de supervisor con acceso a los registros de su área.

**Acceptance Scenarios**:

1. **Given** una cuenta con rol "colaborador", **When** el administrador cambia su rol a "supervisor", **Then** el cambio aplica en la próxima sesión; la sesión activa actual no se interrumpe pero los permisos se actualizan al recargar.
2. **Given** el administrador actualiza el correo de una cuenta, **When** guarda el cambio, **Then** el usuario puede iniciar sesión con el nuevo correo; el anterior deja de funcionar.
3. **Given** una cuenta de colaborador vinculada a un registro, **When** el administrador cambia la vinculación a otro registro, **Then** el nuevo colaborador vinculado puede acceder a su propio historial y el anterior deja de tener acceso con esa cuenta.

---

### User Story 3 - Desactivar y reactivar cuenta (Priority: P1)

El administrador desactiva la cuenta de un usuario que deja de trabajar en la organización o que temporalmente no debe tener acceso al sistema. La cuenta desactivada no puede iniciar sesión pero su historial se preserva.

**Why this priority**: La baja de usuarios es tan crítica como el alta; una cuenta activa de alguien que ya no trabaja en la empresa es un riesgo de acceso no autorizado.

**Independent Test**: El administrador desactiva la cuenta de un supervisor. Ese supervisor intenta iniciar sesión y recibe un mensaje de cuenta inactiva. Sus registros históricos (justificaciones aprobadas, bonos confirmados) permanecen visibles para el administrador.

**Acceptance Scenarios**:

1. **Given** una cuenta activa, **When** el administrador la desactiva, **Then** el usuario no puede iniciar sesión; sus sesiones activas expiran.
2. **Given** una cuenta desactivada, **When** el administrador la reactiva, **Then** el usuario puede volver a iniciar sesión con su contraseña anterior.
3. **Given** el administrador intenta desactivar su propia cuenta (la única cuenta de administrador activa), **When** intenta confirmar, **Then** el sistema impide la acción para evitar quedarse sin administrador activo.
4. **Given** una cuenta desactivada, **When** el administrador consulta el historial del sistema, **Then** los registros creados por ese usuario siguen visibles con su nombre, preservando la auditoría.

---

### User Story 4 - Restablecer contraseña (Priority: P1)

El administrador puede restablecer la contraseña de cualquier usuario que la haya olvidado o que necesite un nuevo acceso, generando una contraseña temporal que el usuario deberá cambiar en su próximo ingreso.

**Why this priority**: La recuperación de acceso es una operación frecuente en el día a día; sin ella, el administrador no puede desbloquear usuarios sin intervención técnica.

**Independent Test**: El administrador restablece la contraseña de un supervisor. El sistema genera una contraseña temporal. El supervisor inicia sesión con esa contraseña y el sistema le exige cambiarla antes de acceder al sistema.

**Acceptance Scenarios**:

1. **Given** el administrador selecciona una cuenta y restablece su contraseña, **When** confirma la acción, **Then** el sistema genera una contraseña temporal y la muestra una única vez al administrador.
2. **Given** un usuario que inicia sesión con contraseña temporal, **When** accede al sistema, **Then** el sistema le exige definir una nueva contraseña antes de poder navegar.
3. **Given** el usuario define su nueva contraseña, **When** ingresa una que no cumple los criterios mínimos de seguridad, **Then** el sistema rechaza la contraseña e informa los requisitos.

---

### User Story 5 - Cambio de contraseña propio (Priority: P2)

El usuario autenticado puede cambiar su propia contraseña desde su perfil de cuenta, sin necesidad de que el administrador intervenga.

**Acceptance Scenarios**:

1. **Given** el usuario autenticado accede a su perfil, **When** ingresa su contraseña actual y la nueva contraseña dos veces, **Then** el sistema actualiza su contraseña y cierra las demás sesiones activas.
2. **Given** el usuario ingresa una contraseña actual incorrecta, **When** intenta confirmar el cambio, **Then** el sistema rechaza la operación sin revelar si la contraseña es incorrecta de forma explícita (mensaje genérico).

---

### Edge Cases

- ¿Puede haber múltiples administradores? → Sí; el sistema debe tener al menos un administrador activo en todo momento. No se puede desactivar el último administrador.
- ¿Se puede tener la misma persona con múltiples cuentas? → No recomendado; el sistema no impide técnicamente que un colaborador tenga dos cuentas con distintos correos, pero el administrador debe gestionar esto manualmente.
- ¿Qué pasa con los registros históricos cuando se cambia el rol de un usuario? → Los registros históricos conservan el rol que tenía el usuario al momento de la acción (auditoría). El cambio de rol no reescribe el historial.
- ¿Puede un supervisor crear cuentas de colaborador? → No; solo el administrador puede gestionar cuentas.

## Requirements *(mandatory)*

### Functional Requirements

**Alta y edición**

- **FR-001**: Solo el rol administrador puede crear, editar, desactivar y reactivar cuentas de usuario.
- **FR-002**: Al crear una cuenta el administrador DEBE especificar: correo electrónico (único), rol (administrador / supervisor / caja / colaborador) y contraseña inicial o solicitar generación automática.
- **FR-003**: Las cuentas de rol "colaborador" DEBEN poder vincularse a un registro de la tabla de colaboradores para habilitar el autoservicio de historial personal.
- **FR-004**: El sistema DEBE impedir crear dos cuentas con el mismo correo electrónico.
- **FR-005**: El administrador puede cambiar el rol de una cuenta existente; el cambio aplica en la siguiente sesión del usuario afectado.

**Desactivación**

- **FR-006**: El administrador puede desactivar cualquier cuenta. Las sesiones activas del usuario desactivado expiran inmediatamente.
- **FR-007**: El sistema DEBE impedir desactivar la última cuenta de administrador activa.
- **FR-008**: Las cuentas desactivadas conservan todos sus registros históricos para auditoría; solo se les impide iniciar nuevas sesiones.

**Contraseñas**

- **FR-009**: Las contraseñas DEBEN tener mínimo 8 caracteres. El sistema DEBE rechazar contraseñas que no cumplan este requisito.
- **FR-010**: El administrador puede generar una contraseña temporal para cualquier usuario. La contraseña temporal se muestra una única vez y expira tras el primer uso exitoso.
- **FR-011**: Al iniciar sesión con contraseña temporal, el sistema DEBE obligar al usuario a definir una nueva contraseña antes de acceder a cualquier otra función.
- **FR-012**: El usuario autenticado puede cambiar su propia contraseña proporcionando la contraseña actual; el cambio cierra las demás sesiones activas.

**Listado y auditoría**

- **FR-013**: El administrador puede ver el listado completo de cuentas con: correo, rol, estado (activo/inactivo), fecha de creación y último acceso.
- **FR-014**: Toda acción sobre cuentas (creación, cambio de rol, desactivación, restablecimiento de contraseña) DEBE registrar: administrador que la realizó, timestamp y acción ejecutada. Cumplimiento del Principio VI.

### Key Entities

- **Cuenta de Usuario**: Credenciales de acceso al sistema; tiene correo, hash de contraseña, rol, estado activo/inactivo y vínculo opcional a un registro de colaborador.
- **Sesión**: Instancia activa de un usuario autenticado; tiene token, fecha de inicio y estado (activo/expirado/cerrado).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador puede crear una cuenta de usuario completa y funcional en menos de 2 minutos.
- **SC-002**: El 100% de las cuentas del sistema tienen rol asignado; ninguna cuenta sin rol existe en el sistema.
- **SC-003**: Al desactivar una cuenta, el acceso del usuario cesa en menos de 60 segundos (expiración de sesión activa).
- **SC-004**: El sistema siempre tiene al menos una cuenta de administrador activa; el 100% de los intentos de desactivar el último administrador son bloqueados.

## Assumptions

- La autenticación es por correo y contraseña (especificada en spec 004). Esta spec cubre exclusivamente la gestión administrativa de cuentas, no el mecanismo de autenticación ni los tokens de sesión.
- No se implementa autenticación de dos factores (2FA) en v1.
- La recuperación de contraseña por el propio usuario (sin intervención del administrador) queda fuera del alcance de v1; el flujo de restablecimiento requiere que el administrador intervenga.
- Un usuario puede tener solo una cuenta activa con un correo dado; no se soporta múltiples cuentas por persona en v1.
- El historial de accesos (último login, intentos fallidos) es visible para el administrador como dato informativo, no como funcionalidad de bloqueo automático en v1.
