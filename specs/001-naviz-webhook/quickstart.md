# Quickstart: Integración CrossChex Cloud

## Configuración de variables de entorno

```bash
# .env
CROSSCHEX_WEBHOOK_SECRET=<secreto-configurado-en-crosschex-settings>
CROSSCHEX_API_KEY=<api_key-desde-crosschex-settings-developer>
CROSSCHEX_API_SECRET=<api_secret-desde-crosschex-settings-developer>
CROSSCHEX_API_BASE_URL=https://api.ap.crosschexcloud.com/
```

> **Importante**: `CROSSCHEX_WEBHOOK_SECRET` es el secreto que configuraste en CrossChex Cloud →
> Settings → System → Application → Webhooks → Secreto.
> Este valor se compara directamente con el header `authorize-sign` que CrossChex envía.

## Escenario 1: Recibir un webhook en tiempo real

CrossChex envía POST a `POST https://tu-servidor/api/webhooks/crosschex`.

El sistema:
1. Verifica que `authorize-sign` == `CROSSCHEX_WEBHOOK_SECRET`
2. Si inválido: registra en `auditoria_webhooks` (estado=`rechazado`), responde 200
3. Si válido: busca colaborador por `personId` (workno), dispositivo por `deviceSn` (serial)
4. Si encontrados: inserta en `eventos_biometricos` (origen=`webhook`), responde 200
5. Si no encontrados: registra en `auditoria_webhooks` (estado=`fallido`), responde 200

## Escenario 2: Sincronización histórica via REST API

```bash
curl -X POST http://localhost:3001/api/crosschex/sync \
  -H "Authorization: Bearer <token-admin>" \
  -H "Content-Type: application/json" \
  -d '{"begin_time": "2026-05-01T00:00:00Z", "end_time": "2026-05-20T23:59:59Z"}'
```

El sistema:
1. Obtiene JWT de CrossChex API (o usa el cacheado si no expiró)
2. Consulta `attendance.record/getrecord` con paginación automática (1000/página)
3. Para cada registro: genera `id_solicitud_externo = 'api-{serial_number}-{checktime}'`
4. Inserta no-duplicados en `eventos_biometricos` (origen=`sincronizacion_api`)
5. Devuelve resumen: `{ total, procesados, duplicados, fallidos }`

## Escenario 3: Verificar estado de la integración

```bash
curl http://localhost:3001/api/crosschex/status \
  -H "Authorization: Bearer <token-admin>"
```

## Prueba de firma de webhook

Si el webhook real no está disponible aún, probar manualmente:

```bash
# Firma inválida → siempre devuelve 200, pero no inserta evento
curl -X POST http://localhost:3001/api/webhooks/crosschex \
  -H "Content-Type: application/json" \
  -H "authorize-sign: firma-incorrecta" \
  -d '{"requestId":"test-001","deviceSn":"SN001","personId":"1001","checkTime":"2026-05-20T08:00:00Z","verifyType":192}'

# Firma correcta (usar el valor de CROSSCHEX_WEBHOOK_SECRET)
curl -X POST http://localhost:3001/api/webhooks/crosschex \
  -H "Content-Type: application/json" \
  -H "authorize-sign: $CROSSCHEX_WEBHOOK_SECRET" \
  -d '{"requestId":"test-001","deviceSn":"SN001","personId":"1001","checkTime":"2026-05-20T08:00:00Z","verifyType":192}'
```
