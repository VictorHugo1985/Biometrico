# Data Model: Paquetes Compartidos del Monorepo

Los paquetes compartidos no tienen acceso a DB. Este documento describe los **contratos de tipos**
que `@biometrico/types` exporta y que representan las entidades del dominio tal como viajan entre
backend y frontend (respuestas de API, payloads de formularios).

---

## `@biometrico/types` — Interfaces y Enums

### Enums

```typescript
// Refleja rol_usuario de PostgreSQL
export enum RolUsuario {
  Administrador = 'administrador',
  Supervisor    = 'supervisor',
  Caja          = 'caja',
  Colaborador   = 'colaborador',
}

// Refleja estado_resultado de PostgreSQL
export enum EstadoResultado {
  Borrador    = 'borrador',
  EnRevision  = 'en_revision',
  Aprobado    = 'aprobado',
}

// Refleja estado_periodo de PostgreSQL
export enum EstadoPeriodo {
  Abierto    = 'abierto',
  Cerrado    = 'cerrado',
  Reabierto  = 'reabierto',
}

// Refleja tipo_ajuste_caja de PostgreSQL
export enum TipoAjusteCaja {
  Descuento   = 'descuento',
  Incremento  = 'incremento',
}

// Refleja tipo_linea_nomina de PostgreSQL
export enum TipoLineaNomina {
  Ordinario        = 'ordinario',
  HoraExtra        = 'hora_extra',
  BonoTransporte   = 'bono_transporte',
  BonoAlimentacion = 'bono_alimentacion',
  Descuento        = 'descuento',
  Ajuste           = 'ajuste',
}

// Estado del bono de transporte (sugerido por sistema)
export enum EstadoBonoTransporte {
  Elegible    = 'elegible',
  NoElegible  = 'no_elegible',
  Confirmado  = 'confirmado',
  Rechazado   = 'rechazado',
}

// Estado del bono de alimentación (manual)
export enum EstadoBonoAlimentacion {
  NoAgregado  = 'no_agregado',
  Pendiente   = 'pendiente',
  Confirmado  = 'confirmado',
  Rechazado   = 'rechazado',
}
```

---

### Entidades del Dominio

```typescript
// entities.ts

export interface Colaborador {
  id:             string;         // UUID
  codigoEmpleado: string;         // workno en CrossChex
  nombre:         string;
  apellido:       string;
  correo?:        string;
  departamentoId: string | null;
  fechaIngreso:   string;         // ISO date YYYY-MM-DD
  fechaBaja?:     string;
  activo:         boolean;
  creadoEn:       string;         // ISO datetime
}

export interface Departamento {
  id:          string;
  nombre:      string;
  descripcion: string | null;
  padreId:     string | null;
  activo:      boolean;
}

export interface Usuario {
  id:            string;
  correo:        string;
  rol:           RolUsuario;
  colaboradorId: string | null;
  activo:        boolean;
  creadoEn:      string;
}

export interface Sesion {
  id:             string;
  usuarioId:      string;
  expiraEn:       string;         // ISO datetime
  estado:         'activo' | 'expirado' | 'cerrado';
}
```

```typescript
// nomina.ts

export interface PeriodoSemanal {
  id:             string;
  inicioPeriodo:  string;         // ISO date — siempre sábado
  finPeriodo:     string;         // ISO date — siempre viernes
  estado:         EstadoPeriodo;
  creadoEn:       string;
}

export interface ResultadoNomina {
  id:                   string;
  periodoId:            string;
  colaboradorId:        string;
  reglaNominaId:        string;
  totalHorasOrdinarias: number;
  totalHorasExtra:      number;
  totalPagoOrdinario:   number;
  totalPagoExtra:       number;
  totalDescuentos:      number;
  totalBruto:           number;
  // Bonos calculados on-the-fly (no en columnas de DB desde migration 004)
  totalBonoTransporte?:   number;
  totalBonoAlimentacion?: number;
  estado:               EstadoResultado;
  calculadoEn:          string;
  calculadoPor:         string;
  aprobadoPor?:         string;
  aprobadoEn?:          string;
}

export interface LineaResultadoNomina {
  id:                string;
  resultadoNominaId: string;
  tipoLinea:         TipoLineaNomina;
  descripcion:       string;
  fechaReferencia:   string;      // ISO date
  cantidad:          number;
  valorUnitario:     number;
  total:             number;
}
```

```typescript
// bonos.ts

export interface BonoDiario {
  id:                  string;
  colaboradorId:       string;
  periodoId:           string;
  fecha:               string;    // ISO date
  estadoTransporte:    EstadoBonoTransporte;
  montoTransporte:     number | null;
  horasTrabajadas:     number | null;
  estadoAlimentacion:  EstadoBonoAlimentacion;
  montoAlimentacion:   number | null;
  gestionadoPor?:      string;
  motivoRechazo?:      string;
}

export interface ConfiguracionBono {
  bonoTransporteDiario:   number;   // Bs
  bonoAlimentacionDiario: number;   // Bs
  umbralHorasTransporte:  number;   // horas mínimas para ser elegible
}
```

```typescript
// pagos.ts

export interface AjusteCaja {
  id:                string;
  resultadoNominaId: string;
  tipo:              TipoAjusteCaja;
  monto:             number;
  motivo:            string;
  cajeroId:          string;
  creadoEn:          string;
  anulado:           boolean;
  anuladoEn?:        string;
  anuladoPor?:       string;
  motivoAnulacion?:  string;
}

export interface ConfirmacionPago {
  id:                string;
  resultadoNominaId: string;
  fechaPago:         string;    // ISO date
  montoPagado:       number;
  metodoPago:        string;
  motivoDiferencia?: string;
  cajeroId:          string;
  creadoEn:          string;
}
```

```typescript
// asistencia.ts

export interface NotaAsistencia {
  id:            string;
  colaboradorId: string;
  periodoId:     string;
  fecha:         string;        // ISO date
  comentario?:   string;        // max 500 chars
  creadoPor:     string;
  creadoEn:      string;
  actualizadoEn: string;
}

export interface AdjuntoNota {
  id:            string;
  notaId:        string;
  nombreArchivo: string;
  mimeType:      'image/jpeg' | 'image/png' | 'application/pdf';
  tamanioBytes:  number;
  storagePath:   string;
  creadoPor:     string;
  creadoEn:      string;
}

export interface Justificacion {
  id:               string;
  colaboradorId:    string;
  periodoId:        string;
  fechaAusencia:    string;       // ISO date
  tipoJustificacion: string;      // FK a tipos_justificacion_catalogo.codigo
  descripcion:      string;
  conPago:          boolean;      // derivado del catálogo, incluido en respuesta de API
  estado:           'pendiente' | 'aprobado' | 'rechazado';
  creadoPor:        string;
  creadoEn:         string;
}
```

---

### Tipos de respuesta de API

```typescript
// api.ts

export interface ApiResponse<T> {
  data:    T;
  message: string;
}

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface ApiError {
  code:    string;      // e.g. 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED'
  message: string;      // mensaje para el usuario (en español, vocabulario del dominio)
  details?: Record<string, string[]>;  // errores de campo para forms
}
```

---

## `@biometrico/utils` — Funciones puras

### Tipos de configuración

```typescript
// storage.ts

export interface StorageConfig {
  allowedMimeTypes: string[];
  maxSizeBytes:     number;
}

export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  maxSizeBytes:     10 * 1024 * 1024,  // 10 MB
};

export enum StorageError {
  FILE_TOO_LARGE  = 'FILE_TOO_LARGE',
  INVALID_MIME    = 'INVALID_MIME_TYPE',
}

export interface FileInput {
  name: string;
  type: string;   // MIME type
  size: number;   // bytes
}
```

### Firmas de funciones

```typescript
// dates.ts
export function toCoT(date: Date | string): Date;
export function parsePeriodo(inicio: string, fin: string): {
  dias:        Date[];
  semanaLabel: string;   // e.g. "Sem. 21 · 17–23 may 2026"
};

// currency.ts
export function formatBs(amount: number): string;  // e.g. "450,50 Bs"

// storage.ts
export function validateFile(file: FileInput, config?: StorageConfig): void;
// Lanza Error con message = StorageError enum value si falla

// validators.ts
export function isValidCodigoEmpleado(code: string): boolean;
export function isPositiveBs(amount: number): boolean;
export function isValidPeriodo(inicio: Date, fin: Date): boolean;
```

### Invariantes y reglas de dominio

| Función | Regla |
|---------|-------|
| `toCoT` | Siempre retorna fecha en UTC−5; Colombia no observa DST |
| `formatBs` | 2 decimales fijos; separador decimal = coma; sufijo ` Bs` |
| `parsePeriodo` | `inicio` = sábado; `fin` = viernes; `dias` tiene exactamente 7 elementos |
| `validateFile` | Lanza si MIME no en lista O size > maxSizeBytes; sin efectos secundarios |
| `isValidCodigoEmpleado` | Solo alfanumérico, 1–20 chars |
| `isPositiveBs` | `amount > 0` y finito |
| `isValidPeriodo` | `fin - inicio === 6 días`; `inicio` es sábado (DOW=6) |
