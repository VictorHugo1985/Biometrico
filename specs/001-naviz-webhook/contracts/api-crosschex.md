# Contrato API: CrossChex Cloud Integration

## POST /api/webhooks/crosschex  *(ya implementado en spec 009)*

**Autenticación**: Header `authorize-sign: <secreto-configurado>` (comparación directa)

**Nota**: Siempre responder HTTP 200. NUNCA devolver 4xx/5xx — CrossChex reintentará.

**Request body** (CrossChex Cloud → servidor):
```json
{
  "requestId": "d9f3cb8b-4115-ac81-b8d1-09de14c2064d",
  "deviceSn":  "1750120622290025",
  "personId":  "1001",
  "checkTime": "2026-05-20T08:00:00Z",
  "verifyType": 192
}
```

**Response 200** (siempre, incluso firma inválida):
```json
{ "code": "200", "msg": "success" }
```

**Bug en spec 009**: el controller lanza HTTP 401 para firma inválida → debe corregirse aquí.

---

## POST /api/crosschex/sync  *(nuevo en spec 001)*

**Autenticación**: Bearer token (rol administrador)

**Request body**:
```json
{
  "begin_time": "2026-05-01T00:00:00Z",
  "end_time":   "2026-05-20T23:59:59Z",
  "workno":     "1001"
}
```
`workno` es opcional — si se omite, sincroniza todos los colaboradores.

**Response 200**:
```json
{
  "data": {
    "total":      1250,
    "procesados": 1180,
    "duplicados": 65,
    "fallidos":   5,
    "errores": [
      { "registro": "api-1750120622290025-2026-05-15T08:00:00.000Z", "motivo": "colaborador no registrado: workno 9999" }
    ]
  },
  "message": "Sincronización completada"
}
```

**Response 400**:
```json
{ "code": "MISSING_PARAMS", "message": "begin_time y end_time son requeridos" }
```

**Response 503** (CrossChex API no disponible):
```json
{ "code": "CROSSCHEX_UNAVAILABLE", "message": "No se pudo conectar con CrossChex Cloud" }
```

---

## GET /api/crosschex/status  *(nuevo en spec 001)*

**Autenticación**: Bearer token (rol administrador)

**Response 200**:
```json
{
  "data": {
    "token_activo": true,
    "token_expira_en": "2026-05-23T08:00:00Z",
    "api_key_configurado": true,
    "api_secret_configurado": true
  }
}
```
Permite al administrador verificar que la integración está correctamente configurada.
