# API Contract: Gestión de Pago por Caja

**Feature**: 012-pago-caja | **Date**: 2026-05-20

Todos los endpoints requieren autenticación. Solo accesibles para rol `caja` y `administrador`, excepto donde se indica.

---

## GET /api/pagos/pendientes

Lista de consolidados aprobados por el supervisor y pendientes de pago por Caja.

**Auth**: caja, administrador

**Query params**:
| Param | Tipo | Descripción |
|-------|------|-------------|
| `departamento_id` | UUID (opcional) | Filtrar por área |
| `colaborador_id` | UUID (opcional) | Filtrar por colaborador |
| `periodo_inicio` | DATE (opcional) | Filtrar por inicio de período (ej. `2026-05-17`) |
| `periodo_fin` | DATE (opcional) | Filtrar por fin de período |

**Response 200**:
```json
{
  "consolidados": [
    {
      "resultado_nomina_id": "uuid",
      "colaborador_id": "uuid",
      "colaborador_nombre": "JULIA RIVERO DE HUANACOTA",
      "departamento": "ACABADO",
      "periodo_inicio": "2026-05-16",
      "periodo_fin": "2026-05-22",
      "total_bruto": 450.00,
      "total_ajustes_caja": -50.00,
      "total_final_caja": 400.00,
      "estado_pago": "pendiente",
      "aprobado_en": "2026-05-22T18:00:00Z"
    }
  ]
}
```

---

## GET /api/pagos/:resultado_nomina_id

Detalle completo de un consolidado: desglose de nómina, ajustes de Caja vigentes y confirmación de pago si existe.

**Auth**: caja, administrador, colaborador (solo el propio)

**Response 200**:
```json
{
  "resultado_nomina_id": "uuid",
  "colaborador_nombre": "JULIA RIVERO DE HUANACOTA",
  "departamento": "ACABADO",
  "periodo_inicio": "2026-05-16",
  "periodo_fin": "2026-05-22",
  "total_bruto": 450.00,
  "lineas": [
    {
      "fecha": "2026-05-16",
      "tipo_linea": "ordinario",
      "descripcion": "8h × 15 Bs",
      "cantidad": 8,
      "valor_unitario": 15.00,
      "total": 120.00
    }
  ],
  "ajustes_caja": [
    {
      "id": "uuid",
      "tipo": "descuento",
      "monto": 50.00,
      "motivo": "Anticipo quincenal",
      "cajero": "Victor Parada",
      "creado_en": "2026-05-20T10:30:00Z",
      "anulado": false
    }
  ],
  "total_final_caja": 400.00,
  "confirmacion_pago": null
}
```

**Response 404**: Consolidado no encontrado

---

## POST /api/pagos/:resultado_nomina_id/ajustes

Agrega un ajuste (descuento o incremento) al consolidado.

**Auth**: caja, administrador

**Precondiciones** (validadas en servicio, error 422 si no se cumplen):
- `resultados_nomina.estado = 'aprobado'`
- No existe `confirmaciones_pago` para este `resultado_nomina_id`
- `total_final_caja` resultante ≥ 0

**Request body**:
```json
{
  "tipo": "descuento",
  "monto": 50.00,
  "motivo": "Anticipo quincenal"
}
```

**Validaciones**:
- `tipo`: requerido, valores: `descuento` | `incremento`
- `monto`: requerido, number > 0
- `motivo`: requerido, string 1–500 chars

**Response 201**:
```json
{
  "id": "uuid",
  "tipo": "descuento",
  "monto": 50.00,
  "motivo": "Anticipo quincenal",
  "cajero_id": "uuid",
  "creado_en": "2026-05-20T10:30:00Z",
  "total_final_caja": 400.00
}
```

**Response 422**: `{ "error": "total_negativo" | "ya_pagado" | "no_aprobado" }`

---

## DELETE /api/pagos/:resultado_nomina_id/ajustes/:ajuste_id

Anula un ajuste de Caja (soft delete).

**Auth**: caja, administrador

**Precondiciones** (error 422 si no se cumplen):
- No existe `confirmaciones_pago` para este `resultado_nomina_id`
- El ajuste pertenece al `resultado_nomina_id` indicado

**Request body**:
```json
{
  "motivo_anulacion": "Error de monto ingresado"
}
```

**Validaciones**:
- `motivo_anulacion`: requerido, string 1–500 chars

**Response 200**:
```json
{
  "id": "uuid",
  "anulado": true,
  "anulado_en": "2026-05-20T11:00:00Z",
  "total_final_caja": 450.00
}
```

---

## POST /api/pagos/:resultado_nomina_id/confirmar

Confirma el pago del consolidado. Operación atómica e irreversible.

**Auth**: caja, administrador

**Precondiciones** (error 422 si no se cumplen):
- `resultados_nomina.estado = 'aprobado'`
- No existe `confirmaciones_pago` para este `resultado_nomina_id`

**Request body**:
```json
{
  "fecha_pago": "2026-05-20",
  "monto_pagado": 400.00,
  "metodo_pago": "efectivo",
  "motivo_diferencia": null
}
```

**Validaciones**:
- `fecha_pago`: requerido, DATE formato ISO
- `monto_pagado`: requerido, number ≥ 0
- `metodo_pago`: requerido, string en lista configurada (default: `efectivo`)
- `motivo_diferencia`: requerido si `monto_pagado ≠ total_final_caja`

**Response 201**:
```json
{
  "id": "uuid",
  "resultado_nomina_id": "uuid",
  "fecha_pago": "2026-05-20",
  "monto_pagado": 400.00,
  "metodo_pago": "efectivo",
  "motivo_diferencia": null,
  "cajero_id": "uuid",
  "creado_en": "2026-05-20T14:00:00Z"
}
```

**Response 422**: `{ "error": "ya_pagado" | "no_aprobado" | "motivo_diferencia_requerido" }`

---

## GET /api/pagos/historial

Historial de pagos confirmados. Para el colaborador, solo devuelve los propios.

**Auth**: caja, administrador, colaborador (solo propios)

**Query params**: `colaborador_id`, `periodo_inicio`, `periodo_fin`, `page`, `page_size`

**Response 200**:
```json
{
  "pagos": [
    {
      "resultado_nomina_id": "uuid",
      "colaborador_nombre": "JULIA RIVERO DE HUANACOTA",
      "departamento": "ACABADO",
      "periodo_inicio": "2026-05-16",
      "periodo_fin": "2026-05-22",
      "total_bruto": 450.00,
      "total_ajustes_caja": -50.00,
      "monto_pagado": 400.00,
      "metodo_pago": "efectivo",
      "fecha_pago": "2026-05-20",
      "cajero": "Victor Parada"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```
