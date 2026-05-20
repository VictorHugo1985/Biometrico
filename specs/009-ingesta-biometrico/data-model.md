# Data Model: Ingesta de Registros Biométricos

## Tablas involucradas (ya en migration 001)

### `eventos_biometricos` (APPEND-ONLY)

| Campo | Tipo | Nota |
|-------|------|------|
| `id` | UUID PK | |
| `id_solicitud_externo` | TEXT UNIQUE | Identificador del proveedor; para CSV: `csv-{hash}` |
| `colaborador_id` | UUID FK | Resolución por `codigo_empleado` |
| `dispositivo_id` | UUID FK | Resolución por nombre del dispositivo |
| `codigo_tipo_verificacion` | INTEGER FK | Código numérico CrossChex (tabla `tipos_verificacion`) |
| `hora_marcacion` | TIMESTAMPTZ | UTC; mostrar en COT en UI |
| `origen` | ENUM | `webhook` | `sincronizacion_api` (CSV usa `sincronizacion_api`) |
| `payload_crudo` | JSONB | Payload original del webhook o fila CSV |

### `auditoria_webhooks`

| Campo | Tipo | Nota |
|-------|------|------|
| `id_solicitud_crosschex` | TEXT | Del header del webhook |
| `firma_valida` | BOOLEAN | Resultado de HMAC check |
| `estado_procesamiento` | ENUM | `procesado` \| `rechazado` \| `fallido` \| `duplicado` |
| `notas_procesamiento` | TEXT | Motivo si fallido/rechazado |
| `evento_biometrico_id` | UUID FK | NULL si no se creó evento |

## Tipos TypeScript de ingesta (no en @biometrico/types — son internos del backend)

```typescript
// CrossChex webhook payload
interface CrossChexPayload {
  requestId:  string;
  deviceSn:   string;
  personId:   string;     // workno del colaborador
  checkTime:  string;     // ISO string
  verifyType: number;
}

// Resultado de procesamiento por evento
interface EventoResult {
  id_solicitud_externo: string;
  estado: 'procesado' | 'duplicado' | 'fallido';
  motivo?: string;
}

// Resultado de importación CSV
interface CSVImportResult {
  total:       number;
  procesados:  number;
  duplicados:  number;
  fallidos:    number;
  errores:     Array<{ fila: number; motivo: string }>;
}
```

## Flujo de estados

```
Webhook recibido
  → firma válida? NO → auditoria (rechazado)
  → firma válida? SÍ
      → colaborador existe? NO → auditoria (fallido, "colaborador no registrado")
      → colaborador existe? SÍ
          → duplicado? SÍ → auditoria (duplicado)
          → duplicado? NO → INSERT eventos_biometricos + auditoria (procesado)
```
