# Research: Paquetes Compartidos del Monorepo

## 1. Estructura de paquetes internos en Turborepo

**Decision**: Directorio `packages/` con paquetes publicables como `workspace:*`

**Rationale**: Turborepo recomienda `packages/` para librerías internas y `apps/` para aplicaciones desplegables. Con `"@biometrico/types": "workspace:*"` en el `package.json` de cada app, pnpm/npm workspaces resuelve el import localmente sin publicar a npm.

**Alternatives considered**:
- Carpeta `shared/` plana: menos convencional, confunde tooling de Turborepo
- Publicar a npm privado: overhead innecesario para v1; complejidad de versión y auth

---

## 2. Build tooling para paquetes TypeScript

**Decision**: `tsup` para `@biometrico/utils`; `tsc --noEmit` + exports de `.ts` directos para `@biometrico/types`

**Rationale**:
- `@biometrico/types`: al ser solo tipos, no necesita compilación de runtime. Se configura `"exports": {"types": "./src/index.ts"}` en `package.json` con `"moduleResolution": "bundler"`. El consumidor (app) hace la compilación.
- `@biometrico/utils`: necesita compilar a JS para que funcione tanto en Next.js (frontend) como en Express (backend). `tsup` genera CJS + ESM en una sola pasada, con sourcemaps y declaraciones de tipos.

**Alternatives considered**:
- `tsc` puro para utils: genera solo CJS o solo ESM, no dual; más configuración
- `esbuild` directo: mismo resultado que tsup pero sin declaraciones de tipos automáticas

---

## 3. Zona horaria COT — `toCoT()`

**Decision**: Usar `date-fns-tz` (parte del ecosistema `date-fns`) para conversión UTC → `America/Bogota`

**Rationale**: Colombia opera en `America/Bogota` (UTC−5) **sin horario de verano (DST)**. La conversión es siempre UTC−5, sin variación estacional. `date-fns-tz` provee `toZonedTime(date, 'America/Bogota')` que retorna un objeto Date con el offset correcto. Es determinística: dado el mismo timestamp UTC produce siempre el mismo resultado.

**Implementation note**: `toCoT` retorna un `Date` con offset `-05:00`. Para serialización a ISO string se usa `formatInTimeZone(date, 'America/Bogota', "yyyy-MM-dd'T'HH:mm:ssxxx")` que produce `2026-05-20T03:00:00-05:00` para UTC `2026-05-20T08:00:00Z`.

**Alternatives considered**:
- `luxon`: más pesado (45kb vs 10kb de date-fns-tz); ya no mantenido activamente
- `dayjs` + plugin timezone: viable, pero date-fns ya era candidato en la spec
- Cálculo manual UTC−5: frágil; no usa base de datos IANA de zonas horarias

---

## 4. Formateo de moneda — `formatBs()`

**Decision**: `Intl.NumberFormat` con locale `es-VE` y 2 decimales, sufijo ` Bs`

**Rationale**: No hay dependencia adicional; `Intl.NumberFormat` está disponible en Node 20.x y todos los navegadores modernos. Formato canónico: `450,50 Bs` (separador decimal = coma, sin separador de miles para montos normales del sistema).

**Implementation**:
```ts
export function formatBs(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' Bs';
}
```

**Alternatives considered**:
- `numeral.js`: dependencia extra innecesaria
- Formato manual con `toFixed(2)`: no maneja separadores de miles consistentemente

---

## 5. Validación de archivos — `validateFile()`

**Decision**: Función pura que recibe `{ name, type, size }` y `StorageConfig`; lanza `StorageError` enum si falla

**Rationale**: La lógica de validación es dominio de `@biometrico/utils`; la carga real a Supabase Storage vive en `apps/backend`. Separar validación de upload permite testear la lógica sin mock del cliente Supabase.

**StorageError design**:
```ts
export enum StorageError {
  FILE_TOO_LARGE   = 'FILE_TOO_LARGE',
  INVALID_MIME     = 'INVALID_MIME_TYPE',
}
```
Errores tipados (enum string) permiten que el consumidor haga switch/case sin depender de mensajes de texto.

---

## 6. Testing

**Decision**: Vitest con coverage via `@vitest/coverage-v8`

**Rationale**: Vitest es nativo ESM, compatible con monorepos pnpm, y 10-20x más rápido que Jest en proyectos TypeScript. No requiere `ts-jest` ni Babel. Configuración mínima en `vitest.config.ts` en la raíz del paquete.

**Test strategy**:
- `toCoT`: probar con 4+ timestamps UTC distintos (enero, junio, DST edges → todos deben producir UTC−5)
- `formatBs`: probar entero, decimal, cero, negativo
- `validateFile`: probar cada rama de error y el caso happy path
- Validators: probar regex/condiciones con casos válidos e inválidos

---

## 7. Configuración Turborepo

**Decision**: Agregar `packages/types` y `packages/utils` al pipeline de `turbo.json`

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

`^build` en `dependsOn` garantiza que los paquetes se construyen antes que las apps que los consumen. Turborepo resuelve el orden automáticamente desde el grafo de dependencias del workspace.
