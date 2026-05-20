# Contrato API: Webhook CrossChex

## POST /api/webhooks/crosschex

**Autenticación**: Cabecera `authorize-sign: <hmac-sha256-hex>` sobre el body raw

**Request body** (JSON de CrossChex Cloud):
```json
{
  "requestId": "REQ-20260520-001",
  "deviceSn":  "C2Pro-ABC123",
  "personId":  "5327643",
  "checkTime": "2026-05-20T08:00:00Z",
  "verifyType": 192
}
```

**Response 200** (siempre, incluso si duplicado o fallido — CrossChex requiere 200):
```json
{ "code": "200", "msg": "success" }
```

**Response 401** (firma inválida):
```json
{ "code": "401", "msg": "invalid signature" }
```

---

## POST /api/registros/import

**Autenticación**: Bearer token (rol administrador)
**Content-Type**: `multipart/form-data`
**Body**: campo `file` con CSV de CrossChex (máx. 5.000 filas)

**Response 200**:
```json
{
  "data": {
    "total": 100,
    "procesados": 87,
    "duplicados": 10,
    "fallidos": 3,
    "errores": [
      { "fila": 15, "motivo": "colaborador no registrado: workno 9999" },
      { "fila": 42, "motivo": "dispositivo no registrado: 'Reloj Piso 3'" },
      { "fila": 78, "motivo": "fecha inválida: '32/13/2026'" }
    ]
  },
  "message": "Importación completada"
}
```

**Response 400** (CSV > 5.000 filas):
```json
{ "code": "IMPORT_TOO_LARGE", "message": "El archivo supera el límite de 5.000 filas" }
```

---

## GET /api/registros

**Autenticación**: Bearer token (rol administrador o supervisor)

**Query params**:
- `colaborador_id` (UUID, opcional)
- `desde` / `hasta` (ISO date, opcional)
- `estado` (`procesado` | `fallido` | `duplicado`, opcional)
- `page` (default: 1) / `page_size` (default: 50, max: 200)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "colaborador": { "id": "uuid", "nombre": "Juan", "apellido": "Pérez" },
      "dispositivo": { "id": "uuid", "nombre": "Reloj Principal" },
      "hora_marcacion": "2026-05-20T03:00:00-05:00",
      "tipo_verificacion": "Huella / Facial",
      "origen": "webhook",
      "estado": "procesado"
    }
  ],
  "total": 1250,
  "page": 1,
  "page_size": 50,
  "total_pages": 25
}
```
