# Research: Integración Webhooks Anviz CrossChex Cloud

## 1. Mecanismo de firma del webhook (`authorize-sign`)

**Decision**: Comparación directa de secreto compartido (no HMAC sobre el body)

**Rationale**: La documentación oficial de CrossChex (`crosschex-cloud-api-spec.md`) muestra el
header `"authorize-sign": "1"` como ejemplo y describe la validación como "validar el header
`authorize-sign` con tu Secreto configurado". No hay evidencia de HMAC sobre el cuerpo —
CrossChex envía el literal del secreto configurado en Settings → Webhooks.

**Crítico**: La implementación en `spec 009` (`webhooks.service.ts`) usa HMAC-SHA256 sobre el raw
body. Si CrossChex envía el secreto literal, todos los webhooks reales serán rechazados.
**Acción correctora**: cambiar `verifySignature` a comparación con `timingSafeEqual` sobre el
secreto directamente, o probar con un device real para confirmar comportamiento.

**Alternatives considered**: HMAC-SHA256 — rechazado: no documentado en la API spec oficial.

---

## 2. Comportamiento HTTP ante firma inválida

**Decision**: Siempre responder HTTP 200 `{"code":"200","msg":"success"}` — incluso firma inválida

**Rationale**: CrossChex API spec (sección 2.4) es explícita: si el servidor no responde con éxito,
CrossChex reintenta 2 veces en 1 minuto. Devolver 401 provoca reintentos infinitos de webhooks con
firma inválida y puede saturar el endpoint.

**Implementación actual**: `webhooks.controller.ts` lanza `UnauthorizedException` (HTTP 401) para
firma inválida — incorrecto. Debe corregirse en spec 001: no lanzar excepción, siempre devolver 200.

**Alternatives considered**: HTTP 401 para firma inválida — rechazado: causa reintentos de CrossChex.

---

## 3. Autenticación REST API CrossChex (JWT)

**Decision**: POST a `https://api.ap.crosschexcloud.com/` con `api_key` + `api_secret` → JWT

**Formato del request**:
```json
{
  "header": {
    "nameSpace": "authorize.token",
    "nameAction": "token",
    "version": "1.0",
    "requestId": "<uuid>",
    "timestamp": "<ISO 8601>"
  },
  "payload": { "api_key": "...", "api_secret": "..." }
}
```

**Token**: en campo `data.payload.token` (JWT). Expira según `data.payload.expires` (ISO 8601).
Almacenamiento en memoria (in-process singleton) — suficiente para v1; si el proceso reinicia,
re-autentica automáticamente.

**Rationale**: Renovación automática: al detectar `expires < now + 5 min`, re-autenticar antes
de la siguiente llamada.

**Alternatives considered**: Almacenar token en DB — rechazado: agrega complejidad sin beneficio
real dado que el token se obtiene en < 1 segundo.

---

## 4. Paginación de registros históricos

**Decision**: Iterar incrementando `page` hasta `page >= pageCount`; máx. 1000 registros/página

**Formato del request**:
```json
{
  "header": { "nameSpace": "attendance.record", "nameAction": "getrecord", "version": "1.0",
               "requestId": "<uuid>", "timestamp": "<ISO 8601>" },
  "authorize": { "type": "token", "token": "<jwt>" },
  "payload": { "begin_time": "<ISO>", "end_time": "<ISO>", "page": 1, "per_page": 1000, "order": "asc" }
}
```

**Condición de corte**: `response.data.payload.page >= response.data.payload.pageCount`

**Rationale**: Límite de 1000 por página es el máximo soportado. Con ~200 colaboradores y ciclos
semanales, raramente se superarán las 2-3 páginas.

**Alternatives considered**: Cursor-based — no soportado por la API CrossChex.

---

## 5. Deduplicación en sincronización REST API

**Decision**: `id_solicitud_externo = 'api-{device.serial_number}-{checktime}'`

**Rationale**: La API REST no provee un `requestId` único por registro (solo hay `requestId` de la
request HTTP, no por registro). La combinación `serial_number + checktime` es única por marcación.
Mismo mecanismo que el CSV import (`csv-{hash}`): intento de INSERT, unique constraint falla → duplicado.

---

## 6. HTTP client para CrossChex API

**Decision**: `node:fetch` (Node 20 built-in) o `axios` (ya disponible vía NestJS deps)

**Rationale**: Axios ya está disponible como dependencia transitiva de NestJS. `node-fetch` sería
redundante. Se usará `fetch` nativo de Node 20 para zero-dep adicional.

**Alternatives considered**: `axios` — no instala nueva dep, también válido; `got` — dep adicional, rechazada.
