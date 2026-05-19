# Feature Specification: Autenticación de Usuarios (Login, Sesión y Recuperación)

**Feature Branch**: `004-user-auth-login`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Login de usuario con correo, recordar credenciales, y reset de contraseña por correo con token de un solo uso."

## Clarifications

### Session 2026-05-18

- Q: ¿Qué almacena el mecanismo "Recordar contraseña" en el dispositivo? → A: Las credenciales (correo y contraseña) se almacenan localmente en el dispositivo de forma cifrada y se reenvían automáticamente en el siguiente login sin intervención del usuario.
- Q: ¿El sistema bloquea los intentos de login tras N fallos consecutivos? → A: No. El sistema no implementa bloqueo por intentos fallidos.
- Q: ¿Se permiten sesiones concurrentes desde múltiples dispositivos? → A: Sí. Un usuario puede tener sesiones activas en múltiples dispositivos simultáneamente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Login con Correo y Contraseña (Priority: P1)

Como **usuario del sistema** (Administrador, Supervisor o Colaborador), quiero iniciar sesión con mi correo electrónico y contraseña para acceder a las funcionalidades que corresponden a mi rol.

**Why this priority**: La autenticación es el control de acceso fundamental. Ninguna funcionalidad operativa puede utilizarse sin identificar al usuario y validar sus permisos.

**Independent Test**: Con credenciales válidas de cada uno de los tres roles, verificar que el login concede acceso y redirige al dashboard correspondiente. Con credenciales incorrectas, verificar que el acceso es denegado con mensaje claro.

**Acceptance Scenarios**:

1. **Given** un usuario registrado con correo y contraseña válidos, **When** ingresa sus credenciales correctas, **Then** el sistema le otorga acceso y redirige a su dashboard inicial según su rol.
2. **Given** credenciales incorrectas (correo o contraseña erróneos), **When** el usuario intenta iniciar sesión, **Then** el sistema deniega el acceso y muestra un mensaje de error genérico sin revelar si fue el correo o la contraseña el incorrecto.
3. **Given** un usuario con cuenta desactivada, **When** intenta iniciar sesión, **Then** el sistema deniega el acceso con un mensaje que indica que la cuenta está inactiva.

---

### User Story 2 — Cierre de Sesión (Priority: P1)

Como **usuario autenticado**, quiero poder cerrar mi sesión de forma explícita para que mis credenciales y acceso queden invalidados en el sistema.

**Why this priority**: La Constitución exige que toda comunicación esté autenticada con tokens de sesión. El cierre de sesión es la contraparte obligatoria del login para garantizar que sesiones abandonadas no queden activas indefinidamente.

**Independent Test**: Iniciar sesión, cerrar sesión, e intentar acceder a una ruta protegida. El sistema debe redirigir al login sin mostrar datos del usuario previo.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** ejecuta el cierre de sesión, **Then** el token de sesión queda invalidado en el servidor y el usuario es redirigido a la pantalla de login.
2. **Given** una sesión cerrada, **When** se intenta usar el token previo para acceder a un recurso protegido, **Then** el sistema rechaza la petición y redirige al login.
3. **Given** una sesión sin actividad durante el tiempo de expiración definido, **When** el usuario intenta continuar navegando, **Then** el sistema invalida la sesión automáticamente y redirige al login con mensaje informativo.

---

### User Story 3 — Recordar Credenciales (Priority: P2)

Como **usuario**, quiero tener la opción de que el sistema recuerde mis credenciales en mi dispositivo para no tener que ingresarlas manualmente en cada sesión.

**Why this priority**: Mejora la experiencia de usuario al reducir la fricción en el acceso frecuente desde dispositivos personales de confianza.

**Independent Test**: Marcar la opción "Recordar contraseña" durante el login, cerrar la aplicación o sesión, y verificar que al regresar a la pantalla de login los campos se autocompletan o el acceso es automático dentro del período de validez.

**Acceptance Scenarios**:

1. **Given** la opción "Recordar contraseña" marcada durante el login, **When** el login es exitoso, **Then** el sistema almacena las credenciales de forma segura en el almacenamiento local del dispositivo.
2. **Given** credenciales guardadas en el dispositivo, **When** el usuario regresa a la pantalla de login, **Then** los campos se autocompletan o el sistema permite el ingreso rápido sin re-ingresar la contraseña.
3. **Given** credenciales guardadas, **When** el usuario cierra sesión de forma explícita, **Then** las credenciales recordadas se mantienen para el próximo login (el "recordar" persiste, solo se cierra la sesión activa).
4. **Given** credenciales recordadas con más de 30 días de antigüedad, **When** el usuario regresa al login, **Then** el sistema solicita re-autenticación completa por seguridad.

---

### User Story 4 — Recuperación de Contraseña por Correo (Priority: P2)

Como **usuario**, quiero poder recuperar el acceso a mi cuenta si olvido mi contraseña, a través de un proceso seguro de restablecimiento por correo electrónico.

**Why this priority**: Sin este mecanismo, un usuario que olvida su contraseña queda bloqueado indefinidamente, requiriendo intervención manual de un administrador.

**Independent Test**: Solicitar reset de contraseña con un correo registrado, recibir el enlace (o verificar en logs en desarrollo), usar el token para cambiar la contraseña, e intentar usar el token una segunda vez. Solo el primer uso debe ser exitoso.

**Acceptance Scenarios**:

1. **Given** un correo electrónico registrado, **When** el usuario solicita recuperar su contraseña, **Then** el sistema envía un correo con un enlace que contiene un token de un solo uso con validez de 60 minutos.
2. **Given** un token válido no usado, **When** el usuario accede al enlace e ingresa una nueva contraseña válida, **Then** la contraseña es actualizada y el token queda invalidado permanentemente.
3. **Given** un token ya utilizado o expirado, **When** el usuario intenta usarlo, **Then** el sistema rechaza la solicitud e indica que el enlace no es válido o ha expirado, con opción de solicitar uno nuevo.
4. **Given** un correo no registrado en el sistema, **When** el usuario solicita recuperación, **Then** el sistema responde con el mismo mensaje de éxito que para un correo registrado (sin revelar si el correo existe o no).

---

### Edge Cases

- ¿Qué pasa si el correo de recuperación nunca llega? El usuario debe poder solicitar un nuevo token (invalidando el anterior) sin esperar a que el anterior expire.
- ¿Qué pasa si se abre el enlace de recuperación desde un dispositivo diferente al que hizo la solicitud? El token debe funcionar en cualquier dispositivo (el reset es por identidad, no por dispositivo).
- ¿Qué pasa si un usuario tiene sesiones activas en múltiples dispositivos cuando cambia su contraseña? Todas las sesiones anteriores deben invalidarse al cambiar la contraseña.
- ¿Qué pasa si un administrador desactiva un usuario mientras tiene una sesión activa? La sesión activa debe invalidarse en la próxima solicitud autenticada.
- ¿Qué pasa si el servicio de correo no está disponible al solicitar el reset? El sistema debe informar al usuario que el correo no pudo enviarse y permitirle reintentar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir el inicio de sesión mediante correo electrónico y contraseña para los tres roles: Administrador, Supervisor y Colaborador.
- **FR-002**: El sistema DEBE redirigir al usuario a su dashboard inicial correspondiente según su rol inmediatamente después de un login exitoso.
- **FR-003**: El sistema DEBE denegar el acceso ante credenciales incorrectas con un mensaje de error genérico que no revele si el fallo fue en el correo o en la contraseña.
- **FR-004**: El sistema DEBE negar el acceso a usuarios con cuentas desactivadas con un mensaje diferenciado del de credenciales incorrectas.
- **FR-006**: El sistema DEBE proveer un mecanismo de cierre de sesión explícito que invalide el token de sesión en el servidor.
- **FR-007**: El sistema DEBE invalidar automáticamente las sesiones inactivas después de un período de inactividad configurable (por defecto: 8 horas).
- **FR-008**: El sistema DEBE ofrecer la opción "Recordar contraseña" en la pantalla de login, almacenando las credenciales (correo y contraseña) de forma cifrada en el almacenamiento local del dispositivo. Al regresar al login, las credenciales almacenadas se usan para autenticar automáticamente sin intervención del usuario, con validez máxima de 30 días desde el último login exitoso.
- **FR-009**: El sistema DEBE permitir solicitar el restablecimiento de contraseña ingresando el correo electrónico registrado, enviando un enlace con token de un solo uso válido por 60 minutos.
- **FR-010**: El sistema DEBE invalidar permanentemente el token de recuperación tras su primer uso exitoso.
- **FR-011**: El sistema DEBE invalidar todas las sesiones activas del usuario cuando su contraseña es cambiada.
- **FR-012**: El sistema DEBE responder con el mismo mensaje de éxito a solicitudes de recuperación para correos registrados y no registrados, para no revelar información sobre usuarios existentes.
- **FR-013**: El sistema DEBE requerir que las nuevas contraseñas cumplan un mínimo de seguridad: al menos 8 caracteres con combinación de letras y números.

### Key Entities

- **Sesión de Usuario**: token de sesión, usuario vinculado, fecha de creación, fecha de expiración, dispositivo/IP, estado (activa/expirada/cerrada). Un usuario puede tener múltiples sesiones activas simultáneas en diferentes dispositivos; cada sesión se gestiona y expira de forma independiente.
- **Token de Recuperación**: token de un solo uso, usuario vinculado, fecha de creación, fecha de expiración, estado (pendiente/usado/expirado).
- **Intento de Login**: origen (IP/dispositivo), timestamp, resultado (exitoso/fallido) — solo para auditoría; no hay lógica de bloqueo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los intentos de login con credenciales correctas otorgan acceso en menos de 3 segundos.
- **SC-002**: El 100% de los intentos de login con credenciales incorrectas son denegados sin revelar información sobre el correo o la contraseña.
- **SC-003**: Ningún token de recuperación de contraseña puede ser usado más de una vez (idempotencia verificable mediante prueba de doble uso).
- **SC-004**: Las sesiones inactivas por más del período configurado se invalidan automáticamente al 100%.
- **SC-005**: El 100% de las sesiones previas de un usuario quedan invalidadas al cambiar su contraseña.
- **SC-006**: El flujo completo de recuperación de contraseña (solicitud → correo → cambio de contraseña) se completa en menos de 5 minutos en condiciones normales.
- **SC-007**: El proceso de login, incluyendo la redirección al dashboard correspondiente, es completable en menos de 2 minutos por un usuario sin instrucciones previas.

## Assumptions

- Los usuarios (cuentas de acceso a la aplicación web) son creados por un Administrador; no existe registro público de nuevas cuentas.
- El correo electrónico es el identificador único de cada usuario del sistema; no se soporta login por nombre de usuario ni número de teléfono.
- La opción "Recordar contraseña" aplica al dispositivo actual del usuario; no sincroniza entre dispositivos.
- El sistema de envío de correos transaccionales (para el reset de contraseña) es un servicio externo ya configurado en el entorno; no está en el alcance de esta especificación.
- Los tres roles (Administrador, Supervisor, Colaborador) comparten el mismo flujo de login; la diferenciación de acceso ocurre después de la autenticación, no durante.
- El tiempo de expiración de sesión por inactividad (por defecto 8 horas) es configurable por el Administrador del sistema.
- La función de "Recordar contraseña" almacena las credenciales cifradas (correo y contraseña) en el dispositivo del usuario; no implica sesión permanente en el servidor. La responsabilidad del cifrado del almacenamiento local recae en el mecanismo nativo del dispositivo/navegador. Si el dispositivo es comprometido físicamente, las credenciales podrían ser accesibles; el usuario debe ser advertido de esto antes de activar la opción en dispositivos compartidos.
