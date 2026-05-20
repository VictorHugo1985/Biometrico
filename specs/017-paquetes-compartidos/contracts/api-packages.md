# Contrato Público: @biometrico/types y @biometrico/utils

## @biometrico/types

**Naturaleza**: Paquete de solo-tipos TypeScript. No produce código JavaScript de runtime.
**Uso**: `import { Colaborador, RolUsuario } from '@biometrico/types'`

### Garantías del contrato

- Todas las interfaces usan `camelCase` (convención TypeScript) que mapea a `snake_case` de PostgreSQL en la capa de transformación del backend.
- Los campos UUID se representan como `string`.
- Los campos de fecha se representan como `string` en formato ISO 8601 (`YYYY-MM-DD` para fechas, `YYYY-MM-DDTHH:mm:ssZ` para timestamps).
- Ningún tipo importa desde `@biometrico/utils` (sin dependencias circulares).
- Todos los enums tienen valores string que coinciden exactamente con los valores de los ENUMs PostgreSQL.

### Exports garantizados (barrel `index.ts`)

```typescript
// Entidades
export type { Colaborador, Departamento, Usuario, Sesion } from './entities';
export type { PeriodoSemanal, ResultadoNomina, LineaResultadoNomina } from './nomina';
export type { BonoDiario, ConfiguracionBono } from './bonos';
export type { AjusteCaja, ConfirmacionPago } from './pagos';
export type { NotaAsistencia, AdjuntoNota, Justificacion } from './asistencia';

// API
export type { ApiResponse, PaginatedResponse, ApiError } from './api';

// Enums (valor en runtime disponible)
export { RolUsuario, EstadoResultado, EstadoPeriodo } from './enums';
export { TipoAjusteCaja, TipoLineaNomina } from './enums';
export { EstadoBonoTransporte, EstadoBonoAlimentacion } from './enums';
```

### Regla de versionado

En v1 no se publica a npm. Cualquier cambio de tipo que rompa compatibilidad (eliminar campo,
cambiar tipo de campo) genera un error de compilación en los consumidores — ese es el mecanismo
de detección, no un número de versión.

---

## @biometrico/utils

**Naturaleza**: Librería de funciones puras. Produce CJS + ESM via tsup.
**Uso**: `import { toCoT, formatBs, validateFile } from '@biometrico/utils'`

### Contrato de cada función

#### `toCoT(date: Date | string): Date`

| | |
|-|-|
| **Input** | `Date` o string ISO 8601 (con o sin timezone) |
| **Output** | `Date` representando el mismo instante en `America/Bogota` (UTC−5) |
| **Throws** | `RangeError` si el input no es una fecha válida |
| **Side effects** | Ninguno |
| **DST** | Colombia no observa DST — siempre UTC−5 sin excepción |

```typescript
toCoT('2026-05-20T08:00:00Z')
// → Date equivalente a 2026-05-20T03:00:00-05:00
```

---

#### `formatBs(amount: number): string`

| | |
|-|-|
| **Input** | Número (positivo, negativo o cero) |
| **Output** | String con 2 decimales, separador decimal coma, sufijo ` Bs` |
| **Throws** | Nunca |
| **Side effects** | Ninguno |

```typescript
formatBs(450.5)   // → "450,50 Bs"
formatBs(1000)    // → "1.000,00 Bs"
formatBs(0)       // → "0,00 Bs"
formatBs(-50.5)   // → "-50,50 Bs"
```

---

#### `parsePeriodo(inicio: string, fin: string): { dias: Date[], semanaLabel: string }`

| | |
|-|-|
| **Input** | Dos strings ISO date `YYYY-MM-DD`; `inicio` debe ser sábado, `fin` debe ser viernes |
| **Output** | Array de 7 `Date` (sábado a viernes en COT) + label de semana |
| **Throws** | `Error` si la diferencia no es 6 días o si `inicio` no es sábado |
| **Side effects** | Ninguno |

```typescript
parsePeriodo('2026-05-16', '2026-05-22')
// → {
//     dias: [Date(sáb 16), Date(dom 17), ..., Date(vie 22)],
//     semanaLabel: "Sem. 21 · 16–22 may 2026"
//   }
```

---

#### `validateFile(file: FileInput, config?: StorageConfig): void`

| | |
|-|-|
| **Input** | `FileInput { name, type, size }` + `StorageConfig` opcional (default: JPEG/PNG/PDF, 10 MB) |
| **Output** | `void` (éxito silencioso) |
| **Throws** | `Error` con `message = StorageError.FILE_TOO_LARGE` o `StorageError.INVALID_MIME` |
| **Side effects** | Ninguno — no realiza la carga, solo valida |

```typescript
validateFile({ name: 'foto.jpg', type: 'image/jpeg', size: 500_000 })
// → void (pasa)

validateFile({ name: 'doc.exe', type: 'application/x-msdownload', size: 100 })
// → throws Error('INVALID_MIME_TYPE')

validateFile({ name: 'video.mp4', type: 'video/mp4', size: 20_000_000 })
// → throws Error('FILE_TOO_LARGE')  (también INVALID_MIME, FILE_TOO_LARGE tiene precedencia)
```

---

#### Validadores de dominio

```typescript
isValidCodigoEmpleado(code: string): boolean
// Válido: alfanumérico, 1–20 chars
// isValidCodigoEmpleado('5327643') → true
// isValidCodigoEmpleado('')        → false
// isValidCodigoEmpleado('AB#12')   → false

isPositiveBs(amount: number): boolean
// Válido: number > 0 y Number.isFinite(amount)
// isPositiveBs(15)    → true
// isPositiveBs(0)     → false
// isPositiveBs(-1)    → false
// isPositiveBs(Infinity) → false

isValidPeriodo(inicio: Date, fin: Date): boolean
// Válido: fin - inicio = 6 días exactos; inicio es sábado (DOW=6 en COT)
// isValidPeriodo(new Date('2026-05-16'), new Date('2026-05-22')) → true
// isValidPeriodo(new Date('2026-05-17'), new Date('2026-05-23')) → false (domingo)
```
