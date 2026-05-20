# Research: Ingesta de Registros Biométricos

## 1. Validación de firma HMAC del webhook CrossChex

**Decision**: HMAC-SHA256 sobre el payload JSON raw con secreto `WEBHOOK_SECRET`

**Rationale**: CrossChex Cloud envía cabecera `authorize-sign` con la firma. El backend la verifica
antes de procesar. Se usa el payload raw (no parseado) para evitar diferencias de serialización.

```typescript
import crypto from 'crypto';

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

**Alternatives considered**: Verificación por IP de origen CrossChex — rechazado por frágil (IPs cambian).

## 2. Deduplicación de eventos

**Decision**: `id_solicitud_externo` con constraint `UNIQUE` en `eventos_biometricos`

**Rationale**: CrossChex puede reenviar el mismo evento en reintentos. El campo `id_solicitud_externo`
del payload identifica unívocamente cada marcación. Al intentar insertar un duplicado, el DB retorna
error unique violation → el webhook responde `{"code":"200","msg":"success"}` igualmente (CrossChex
no debe reintent infinitamente) pero registra estado 'duplicado' en `auditoria_webhooks`.

## 3. Parseo de CSV CrossChex

**Decision**: `csv-parse` (Node.js) en modo streaming con validación por fila

**Columnas esperadas** (de la clarificación en spec):
`No.`, `Employee ID`, `Employee Name`, `Department`, `Check Time`, `State`, `Device Name`

**Mapeo**:
- `Employee ID` → `codigo_empleado` → lookup `colaboradores.codigo_empleado`
- `Device Name` → lookup `dispositivos_biometricos.nombre`
- `Check Time` → parse con `date-fns` → `hora_marcacion TIMESTAMPTZ`
- `State` → código numérico → `codigo_tipo_verificacion`

**Deduplicación**: generar `id_solicitud_externo = 'csv-{hash(Employee ID + Check Time)}'`

## 4. Procesamiento asíncrono vs. síncrono del CSV

**Decision**: Síncrono para ≤ 5.000 filas (dentro del límite de la spec)

**Rationale**: Con 5.000 filas el procesamiento tarda < 10 segundos. No justifica una cola de jobs
para v1. El endpoint responde con JSON del resultado completo (procesados, duplicados, fallidos).

## 5. Vista de registros — paginación

**Decision**: Paginación server-side con `LIMIT/OFFSET`; 50 registros por página

**Rationale**: Los eventos biométricos son append-only y crecen continuamente. Sin paginación la
tabla sería inmanejable a los 6 meses. Cursor-based pagination sería más eficiente pero agrega
complejidad no justificada para v1.

## 6. Conversión de zona horaria en vista

**Decision**: `toCoT()` de `@biometrico/utils` para mostrar horas en COT en la UI

**Rationale**: Los timestamps en DB son UTC. La UI muestra siempre en hora colombiana. Consistencia
con el resto del sistema.
