# UI Contract: Gestión de Pago por Caja

**Feature**: 012-pago-caja | **Date**: 2026-05-20

---

## Vista 1: Cola de Pendientes (`/caja`)

**Acceso**: rol `caja`, `administrador`

**Componentes**:
- Filtros: dropdown de departamento, búsqueda por nombre, rango de fechas de período
- Tabla PrimeReact DataTable con columnas:
  - Colaborador (nombre + área)
  - Período (fecha inicio – fin)
  - Total calculado por supervisor (Bs)
  - Total ajustes Caja (Bs, con badge de color: rojo=descuento neto, verde=incremento neto)
  - **Total final Caja** (Bs, destacado)
  - Fecha de aprobación del supervisor
  - Acción: botón "Revisar y Pagar"

**Estados de la lista**:
- Lista con items: tabla con filas clickeables
- Lista vacía: mensaje "No hay consolidados pendientes de pago"
- Cargando: skeleton de tabla

**Navegación**: click en fila o botón "Revisar y Pagar" → Vista 2

---

## Vista 2: Detalle del Consolidado (`/caja/:resultado_nomina_id`)

**Acceso**: rol `caja`, `administrador`

**Layout**:
```
┌─────────────────────────────────────────────┐
│  ← Volver a pendientes                       │
│  JULIA RIVERO DE HUANACOTA — ACABADO         │
│  Período: 16 May – 22 May 2026               │
├─────────────────────────────────────────────┤
│  DESGLOSE DE NÓMINA (solo lectura)           │
│  ┌──────────────────────────────────────┐   │
│  │ Tabla de líneas por día              │   │
│  │ Fecha | Concepto | Horas | Monto     │   │
│  └──────────────────────────────────────┘   │
│  Subtotal nómina: 450.00 Bs                  │
├─────────────────────────────────────────────┤
│  AJUSTES DE CAJA                             │
│  [+ Agregar ajuste]                          │
│  ┌──────────────────────────────────────┐   │
│  │ Tipo | Monto | Motivo | Acciones     │   │
│  │ Descuento | -50.00 | Anticipo... [x] │   │
│  └──────────────────────────────────────┘   │
│  Total ajustes: -50.00 Bs                   │
├─────────────────────────────────────────────┤
│  TOTAL A PAGAR: 400.00 Bs                   │
│                   [Confirmar Pago]           │
└─────────────────────────────────────────────┘
```

**Componentes**:
- Panel "Desglose de Nómina": DataTable readonly con líneas de `lineas_resultado_nomina`
- Panel "Ajustes de Caja": DataTable editable con ajustes activos; botón eliminar por fila
- Total final: calculado en tiempo real al agregar/eliminar ajustes
- Botón "Confirmar Pago": activa el Dialog de confirmación

**Estados**:
- Consolidado pendiente: formulario completo habilitado
- Consolidado pagado: todos los campos en solo lectura; banner "PAGADO el [fecha] por [cajero]"

---

## Dialog: Agregar Ajuste

**Trigger**: botón "+ Agregar ajuste" en Vista 2

**Campos**:
| Campo | Tipo | Validación |
|-------|------|------------|
| Tipo | Dropdown: Descuento / Incremento | Requerido |
| Monto (Bs) | InputNumber | Requerido, > 0; si descuento: no puede dejar total < 0 |
| Motivo | InputTextarea | Requerido, 1–500 chars |

**Validación en tiempo real**: si tipo=descuento y monto > total_final_caja, mostrar error inline "El descuento supera el total disponible".

**Acciones**:
- "Guardar ajuste" → POST /api/pagos/:id/ajustes → actualiza total en vista
- "Cancelar" → cierra dialog sin cambios

---

## Dialog: Confirmar Pago

**Trigger**: botón "Confirmar Pago" en Vista 2

**Campos**:
| Campo | Tipo | Validación |
|-------|------|------------|
| Fecha de pago | Calendar | Requerido, fecha ≤ hoy |
| Monto pagado (Bs) | InputNumber | Requerido, ≥ 0, pre-relleno con total_final_caja |
| Método de pago | Dropdown | Requerido, default "Efectivo" |
| Motivo diferencia | InputTextarea | Requerido solo si monto_pagado ≠ total_final_caja |

**Pre-relleno**: `monto_pagado` se inicializa con `total_final_caja` calculado.

**Advertencia**: si el cajero cambia `monto_pagado`, mostrar alerta "El monto pagado difiere del total calculado. Se requiere motivo."

**Confirmación doble**: antes del submit, mostrar resumen:
> "Vas a confirmar el pago de **400.00 Bs** a **JULIA RIVERO DE HUANACOTA** el **20/05/2026**. Esta acción es irreversible."

**Acciones**:
- "Confirmar" → POST /api/pagos/:id/confirmar → redirige a cola de pendientes
- "Cancelar" → cierra dialog

---

## Vista 3: Historial del Colaborador (extensión)

La vista existente de historial del colaborador agrega por cada período:

- Indicador de estado de pago: badge "PAGADO" (verde) o "PENDIENTE DE PAGO" (amarillo)
- Si pagado: fecha de pago + monto pagado
- Enlace "Ver detalle" → versión solo-lectura de Vista 2

**Acceso**: colaborador (solo propio), supervisor (lectura), administrador, caja
