# Feature Specification: Integración Webhooks Anviz CrossChex Cloud

**Feature Branch**: `001-naviz-webhook`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Quiero implementar webhooks desde mi proveedor de reloj biometricos naviz, de acuerdo a las especificaciones tecnicas requeridas en el crosschex-cloud-api-spec.md"

## Clarifications

### Session 2026-05-18

- Q: ¿Qué acción debe tomar el sistema con los registros de asistencia recibidos? → A: Solo persistirlos en base de datos local (sin reenvío a sistemas externos).

### Session 2026-05-20

- Q: ¿Qué hace el sistema cuando el `personId`/`workno` del evento no coincide con ningún colaborador local? → A: Marcar como `fallido` en `auditoria_webhooks`, no insertar en `eventos_biometricos`, responder HTTP 200. El campo `colaboradores.codigo_empleado` es equivalente al `workno` de Anviz y es la clave de resolución.
- Q: ¿Cómo valida CrossChex la autenticidad del webhook (`authorize-sign`)? → A: CrossChex envía el secreto configurado literalmente como valor del header. La validación es comparación directa con `timingSafeEqual` (no HMAC).
- Q: ¿Dónde se almacena el token JWT de CrossChex API entre llamadas? → A: Solo en memoria del proceso (singleton en `CrossChexService`); si el proceso reinicia, re-autentica automáticamente. No requiere tabla en DB.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Recepción en Tiempo Real de Registros de Asistencia (Priority: P1)

Cuando un empleado marca su asistencia en un dispositivo biométrico Anviz, el sistema recibe inmediatamente la notificación vía webhook de CrossChex Cloud y almacena el registro de asistencia para su posterior procesamiento.

**Why this priority**: Es el núcleo del negocio: sin recibir y persistir el evento de asistencia en tiempo real, el resto de la integración carece de valor.

**Independent Test**: Se puede probar de forma independiente configurando el endpoint de webhooks en CrossChex Cloud y realizando un marcaje real en el dispositivo. El sistema debe almacenar el registro y responder HTTP 200.

**Acceptance Scenarios**:

1. **Given** un empleado marca entrada en el dispositivo biométrico, **When** CrossChex envía un POST al endpoint de webhooks, **Then** el sistema responde HTTP 200 con `{"code":"200","msg":"success"}` en menos de 5 segundos y persiste el registro de asistencia.
2. **Given** CrossChex envía un webhook con firma `authorize-sign` válida, **When** el sistema lo recibe, **Then** valida la firma correctamente y procesa el registro.
3. **Given** CrossChex envía un webhook con firma `authorize-sign` inválida, **When** el sistema lo recibe, **Then** rechaza la petición (no la procesa) pero igualmente responde HTTP 200 para evitar reintentos, y registra el intento inválido en logs.
4. **Given** el sistema falla al procesar internamente un webhook válido, **When** CrossChex reintenta 2 veces en 1 minuto, **Then** el sistema puede recuperar el registro en cualquiera de los reintentos.

---

### User Story 2 — Validación de Seguridad del Webhook (Priority: P1)

El sistema verifica que cada petición de webhook proviene genuinamente de CrossChex Cloud y no de un tercero no autorizado.

**Why this priority**: Sin validación de autenticidad, cualquier actor puede enviar datos falsos de asistencia al endpoint, comprometiendo la integridad del sistema.

**Independent Test**: Se puede probar enviando peticiones POST al endpoint con firmas válidas e inválidas y verificando que solo las válidas son procesadas.

**Acceptance Scenarios**:

1. **Given** el webhook incluye el header `authorize-sign` correcto basado en el secreto configurado, **When** llega al endpoint, **Then** el sistema acepta y procesa el evento.
2. **Given** el webhook incluye el header `authorize-sign` incorrecto o ausente, **When** llega al endpoint, **Then** el sistema rechaza el procesamiento, registra el intento en logs de seguridad y responde HTTP 200 (para no revelar el motivo del rechazo a actores maliciosos).

---

### User Story 3 — Consulta de Registros Históricos via REST API (Priority: P2)

El sistema puede consultar registros de asistencia históricos directamente desde la API REST de CrossChex Cloud, permitiendo sincronización retroactiva o reportes de períodos anteriores.

**Why this priority**: Complementa el webhook con datos históricos: útil para reconciliación, datos perdidos durante caídas del webhook, o reportes de períodos pasados.

**Independent Test**: Se puede probar independientemente consultando la API REST con credenciales válidas y un rango de fechas, verificando que se obtienen y paginan correctamente los registros.

**Acceptance Scenarios**:

1. **Given** el sistema tiene configuradas las credenciales `api_key` y `api_secret`, **When** se solicita sincronización histórica para un rango de fechas, **Then** el sistema obtiene un token JWT, consulta todos los registros paginados (hasta 1000 por página) y persiste los no existentes.
2. **Given** el token JWT está próximo a expirar, **When** el sistema realiza una consulta a la API REST, **Then** renueva automáticamente el token antes de que expire.
3. **Given** existen más de 1000 registros para el rango consultado, **When** el sistema recibe la primera página, **Then** itera automáticamente por todas las páginas hasta obtener el total (`page >= pageCount`).

---

### Edge Cases

- ¿Qué pasa si CrossChex envía el mismo evento de asistencia dos veces (idempotencia)? El sistema debe detectar duplicados por `requestId` y no crear registros duplicados.
- ¿Cómo se comporta el endpoint si recibe una carga masiva de webhooks simultáneos? El sistema debe manejar concurrencia sin perder eventos.
- ¿Qué pasa si la base de datos local no está disponible cuando llega un webhook? El sistema debe responder HTTP 200 igual (para evitar reintentos infinitos de CrossChex) y recuperar el evento por otro medio.
- ¿Qué ocurre si el token JWT expira durante una consulta paginada larga? El sistema debe renovar el token y retomar la paginación sin perder datos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE exponer un endpoint HTTP público que acepte peticiones POST de CrossChex Cloud con el Content-Type `application/json`.
- **FR-002**: El sistema DEBE validar el header `authorize-sign` de cada webhook entrante comparándolo directamente (con `timingSafeEqual`) contra el secreto configurado en `CROSSCHEX_WEBHOOK_SECRET`. CrossChex envía el secreto literal como valor del header — no se usa HMAC.
- **FR-003**: El sistema DEBE responder con HTTP 200 y el cuerpo `{"code":"200","msg":"success"}` ante cualquier webhook recibido (válido o inválido), para evitar que CrossChex agote los reintentos innecesariamente.
- **FR-004**: El sistema DEBE persistir los datos del registro de asistencia de cada webhook válido: tipo de verificación (`checktype`), fecha/hora (`checktime`), datos del dispositivo (`device.serial_number`, `device.name`) y datos del empleado. La resolución del colaborador se realiza buscando `colaboradores.codigo_empleado = personId` (webhook) o `= employee.workno` (REST API). Si no se encuentra el colaborador, el evento se registra como `fallido` en `auditoria_webhooks` y **no** se inserta en `eventos_biometricos`.
- **FR-005**: El sistema DEBE detectar y descartar eventos duplicados usando el `requestId` del header del webhook.
- **FR-006**: El sistema DEBE autenticarse contra la API REST de CrossChex Cloud usando `api_key` y `api_secret` para obtener un token JWT.
- **FR-007**: El sistema DEBE renovar automáticamente el token JWT antes de que expire, sin intervención manual.
- **FR-008**: El sistema DEBE poder consultar registros históricos de asistencia en la API REST filtrando por rango de fechas, con soporte de paginación (máximo 1000 registros por página).
- **FR-009**: El sistema DEBE registrar en logs todos los eventos de webhook recibidos (válidos e inválidos) con suficiente detalle para auditoría y diagnóstico.
- **FR-010**: El sistema DEBE persistir cada registro de asistencia recibido (vía webhook o API REST) en la base de datos local del sistema. No se requiere reenvío automático a sistemas externos.

### Key Entities

- **RegistroAsistencia** → persiste en `eventos_biometricos`: `id_solicitud_externo` (= `requestId` para webhook; `api-{serial}-{checktime}` para REST), `colaborador_id` (FK resuelto por `codigo_empleado = workno`), `dispositivo_id` (FK), `codigo_tipo_verificacion` (= `checktype`), `hora_marcacion` (= `checktime`), `origen` (`webhook` | `sincronizacion_api`), `payload_crudo` (JSONB con payload original)
- **TokenJWT** (en memoria, no en DB): `token`, `expiresAt` — singleton en `CrossChexService`; se renueva automáticamente si `expiresAt - 5min < now`
- **EventoWebhook**: `request_id`, `received_at`, `is_valid`, `raw_headers`, `raw_payload` — para auditoría y diagnóstico

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los webhooks válidos recibidos se procesan y persisten correctamente en menos de 5 segundos desde su recepción.
- **SC-002**: El 0% de registros de asistencia se pierden durante el funcionamiento normal del sistema (uptime > 99%).
- **SC-003**: El sistema detecta y descarta el 100% de webhooks con firma inválida, sin crear registros espurios.
- **SC-004**: El sistema no genera registros duplicados cuando CrossChex reenvía el mismo evento (idempotencia 100%).
- **SC-005**: La consulta de registros históricos via REST API recupera el 100% de los registros en el rango de fechas solicitado, independientemente del volumen (paginación automática).
- **SC-006**: El token JWT se renueva automáticamente sin errores de autenticación durante consultas prolongadas.
- **SC-007**: Todos los intentos de webhook (válidos e inválidos) quedan trazables en logs con datos suficientes para auditoría forense.

## Assumptions

- El **Developer Mode** de Anviz ya está activado (o será activado) en la cuenta CrossChex Cloud antes de comenzar la implementación.
- El servidor que hospeda el endpoint de webhooks tiene una URL pública accesible desde internet (CrossChex Cloud debe poder alcanzarla).
- Las credenciales `api_key`, `api_secret` y el `secreto` del webhook se gestionan como variables de entorno o secretos, nunca en el código fuente.
- Los relojes biométricos ya están correctamente registrados y sincronizados con CrossChex Cloud.
- La región de CrossChex Cloud a usar es Asia-Pacífico (`https://api.ap.crosschexcloud.com/`); si se usa la región EU, será necesario ajustar la URL base.
- Los registros de asistencia se identifican unívocamente por la combinación de `employee.workno` + `checktime` + `device.serial_number` como alternativa al `requestId`.
- El volumen esperado de webhooks es manejable con un único endpoint (sin necesidad de cola de mensajes distribuida para el MVP).
