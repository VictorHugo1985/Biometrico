# Data Model: Integración CrossChex Cloud

## Tablas involucradas (ya en migración 001)

### `eventos_biometricos` (APPEND-ONLY — Principio I)

Misma tabla que spec 009. La sincronización REST API usa `origen = 'sincronizacion_api'`.

| Campo | Tipo | Nota para spec 001 |
|-------|------|--------------------|
| `id_solicitud_externo` | TEXT UNIQUE | `api-{device.serial_number}-{checktime}` para REST API |
| `colaborador_id` | UUID FK | Resolución por `colaboradores.codigo_empleado` ↔ `employee.workno` |
| `dispositivo_id` | UUID FK | Resolución por `dispositivos_biometricos.numero_serie` ↔ `device.serial_number` |
| `codigo_tipo_verificacion` | INTEGER FK | `checktype` del payload CrossChex |
| `hora_marcacion` | TIMESTAMPTZ | `checktime` ISO 8601 → UTC |
| `origen` | ENUM | `sincronizacion_api` para ambos REST y CSV |
| `payload_crudo` | JSONB | Objeto completo del registro CrossChex |

### `auditoria_webhooks`

Usada solo para webhooks en tiempo real (no para sincronización REST).

## Tipos TypeScript (internos del backend)

```typescript
// CrossChex REST API — request de autenticación
interface CrossChexAuthRequest {
  header: {
    nameSpace:  'authorize.token';
    nameAction: 'token';
    version:    '1.0';
    requestId:  string;
    timestamp:  string;
  };
  payload: {
    api_key:    string;
    api_secret: string;
  };
}

// CrossChex REST API — respuesta de autenticación
interface CrossChexAuthResponse {
  code: number;
  data: {
    payload: {
      token:   string;
      expires: string; // ISO 8601
    };
  };
}

// CrossChex REST API — request de registros
interface CrossChexRecordsRequest {
  header: {
    nameSpace:  'attendance.record';
    nameAction: 'getrecord';
    version:    '1.0';
    requestId:  string;
    timestamp:  string;
  };
  authorize: { type: 'token'; token: string };
  payload: {
    begin_time: string;
    end_time:   string;
    workno?:    string;
    order?:     'asc' | 'desc';
    page:       number;
    per_page:   number;
  };
}

// Un registro individual en la respuesta
interface CrossChexRecord {
  checktype: number;
  checktime: string;
  device:    { serial_number: string; name: string };
  employee:  { first_name: string; last_name: string; workno: string };
}

// Respuesta de registros
interface CrossChexRecordsResponse {
  code: number;
  data: {
    payload: {
      count:     number;
      list:      CrossChexRecord[];
      page:      number;
      perPage:   number;
      pageCount: number;
    };
  };
}

// Resultado de sincronización histórica
interface SyncResult {
  total:      number;
  procesados: number;
  duplicados: number;
  fallidos:   number;
  errores:    Array<{ registro: string; motivo: string }>;
}
```

## Token en memoria

El token JWT de CrossChex se almacena en memoria en el `CrossChexService`:

```typescript
private tokenCache: { token: string; expiresAt: Date } | null = null;
```

No persiste entre reinicios del proceso (re-autentica automáticamente al detectar `tokenCache === null`).
