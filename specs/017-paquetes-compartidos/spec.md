# Feature Specification: Paquetes Compartidos del Monorepo

**Feature Branch**: `017-paquetes-compartidos`

**Created**: 2026-05-20

**Status**: Draft

**Input**: Necesidad identificada en análisis de arquitectura: los módulos del monorepo comparten tipos TypeScript, utilidades de fecha/moneda y el patrón de carga de archivos. Sin un paquete compartido definido, cada módulo reimplementa estas funciones de forma inconsistente.

## Clarifications

### Session 2026-05-20

- Q: ¿Se usa Supabase Auth o autenticación custom para las sesiones? → A: Autenticación custom con tablas propias (`sesiones_usuario`, `tokens_recuperacion`, `intentos_login`). El backend emite y valida tokens propios. No depende de Supabase Auth.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tipos TypeScript compartidos disponibles en frontend y backend (Priority: P1)

Un desarrollador que trabaja en el módulo de liquidación (backend) define la interfaz `ResultadoNomina`. Otro desarrollador que trabaja en la vista de liquidación (frontend) importa esa misma interfaz desde el paquete compartido sin copiar ni redefinir el tipo.

**Why this priority**: Sin tipos compartidos, el frontend y el backend divergen silenciosamente: el backend devuelve `total_bruto` y el frontend espera `totalBruto`. Estos errores solo aparecen en tiempo de ejecución y son difíciles de detectar.

**Independent Test**: Agregar un campo a una interfaz en `packages/types` y verificar que el compilador TypeScript marca el error en todos los lugares del frontend y backend que usan esa interfaz sin necesidad de cambiar los imports.

**Acceptance Scenarios**:

1. **Given** el paquete `@biometrico/types` está configurado en el workspace, **When** un desarrollador importa `import { Colaborador } from '@biometrico/types'` en el backend y en el frontend, **Then** ambos usan la misma definición y TypeScript valida la consistencia en tiempo de compilación.
2. **Given** un tipo cambia en `packages/types`, **When** se ejecuta la validación de tipos del workspace (`turbo typecheck`), **Then** todos los usos incompatibles del tipo aparecen como errores antes de que el código llegue a producción.
3. **Given** el workspace tiene paquetes `apps/backend` y `apps/frontend`, **When** se agrega una nueva interfaz al paquete `@biometrico/types`, **Then** está disponible en ambas apps sin pasos adicionales de publicación o build manual.

---

### User Story 2 - Utilidades de fecha y moneda consistentes (Priority: P1)

Un desarrollador que trabaja en cualquier módulo del sistema (liquidación, bonos, pagos, dashboard) usa la función `toCoT(date)` para convertir una fecha a la zona horaria de Colombia y `formatBs(amount)` para mostrar un monto en Bolívares, sin reimplementar la lógica en cada módulo.

**Why this priority**: La zona horaria COT (`America/Bogota`) afecta el cálculo de asistencia, la agrupación de marcaciones por día y el timestamp de los eventos. Un error en esta conversión produce días mal contabilizados. La inconsistencia en formateo monetario produce confusión en la UI.

**Independent Test**: La función `toCoT` convierte correctamente una timestamp UTC a hora colombiana incluyendo el manejo del horario de verano (Colombia no observa DST, siempre UTC−5). Se prueba con fechas en distintas épocas del año y se verifica que el resultado es siempre UTC−5.

**Acceptance Scenarios**:

1. **Given** una timestamp UTC `2026-05-20T08:00:00Z`, **When** se aplica `toCoT()`, **Then** retorna `2026-05-20T03:00:00-05:00` (UTC−5 sin variación estacional).
2. **Given** un monto `450.5`, **When** se aplica `formatBs(450.5)`, **Then** retorna la representación canónica del sistema (ej. `450,50 Bs`), consistente en toda la UI.
3. **Given** cualquier módulo del workspace importa `import { toCoT, formatBs } from '@biometrico/utils'`, **When** se compila, **Then** no hay duplicación de lógica de fecha o moneda en ningún módulo individual.

---

### User Story 3 - Patrón de carga de archivos centralizado (Priority: P1)

Un desarrollador que implementa la carga de fotos en notas de asistencia (spec 011) y otro que implementa adjuntos en justificaciones (spec 014) usan el mismo servicio de storage sin reimplementar la lógica de validación de tipo, tamaño y ruta en Supabase Storage.

**Why this priority**: Specs 011 y 014 definen los mismos requisitos de archivos (JPEG, PNG, PDF, máx. 10 MB). Si cada módulo lo implementa por separado, los límites pueden divergir y la configuración del bucket de Supabase Storage queda duplicada.

**Independent Test**: El `StorageService` rechaza archivos con tipo no permitido y archivos que superan el límite configurado, independientemente de qué módulo lo llame. La configuración del bucket y los límites se definen una vez.

**Acceptance Scenarios**:

1. **Given** el `StorageService` está configurado con tipos permitidos y tamaño máximo, **When** cualquier módulo llama a `storageService.upload(file, bucket, path)`, **Then** la validación de tipo y tamaño se aplica antes de intentar la carga.
2. **Given** un archivo que supera el límite de tamaño, **When** se llama a `storageService.upload()`, **Then** el servicio lanza un error tipado (`StorageError.FILE_TOO_LARGE`) que el módulo consumidor puede manejar con un mensaje de UI apropiado.
3. **Given** la configuración del tamaño máximo cambia (ej. de 10 MB a 20 MB), **When** se actualiza en un único lugar (`packages/utils/src/storage.config.ts`), **Then** aplica a todos los módulos que usan el servicio sin cambios adicionales.

---

### User Story 4 - Validaciones de dominio reutilizables (Priority: P2)

Los desarrolladores usan funciones de validación compartidas para reglas de dominio que aparecen en múltiples módulos: validar que un `codigo_empleado` es alfanumérico, que un monto en Bs es positivo, que una fecha está dentro de un período válido.

**Acceptance Scenarios**:

1. **Given** la función `isValidCodigoEmpleado(code)` está en `@biometrico/utils`, **When** se usa en el módulo de colaboradores (backend) y en el formulario de alta (frontend), **Then** ambos aplican la misma regla sin duplicación.
2. **Given** una regla de validación de dominio cambia, **When** se actualiza en el paquete compartido, **Then** aplica a todos los módulos sin necesidad de buscar duplicados.

---

### Edge Cases

- ¿Qué pasa si el backend necesita una utilidad que no tiene sentido en el frontend (ej. acceso a DB)? → Los paquetes compartidos contienen solo lógica pura (sin efectos secundarios, sin acceso a DB ni DOM). Las dependencias de plataforma quedan en cada app.
- ¿Puede `packages/types` importar desde `packages/utils`? → No; `packages/types` no tiene dependencias internas para evitar ciclos. Solo exporta interfaces y tipos.
- ¿Cómo se versionan los paquetes compartidos? → En el monorepo con workspace protocol (`"@biometrico/types": "workspace:*"`); no se publican a npm en v1.

## Requirements *(mandatory)*

### Functional Requirements

**`packages/types` — Tipos compartidos**

- **FR-001**: El paquete `@biometrico/types` DEBE exportar interfaces TypeScript para todas las entidades del dominio que se transmiten entre frontend y backend: `Colaborador`, `Departamento`, `PeriodoSemanal`, `ResultadoNomina`, `LineaResultadoNomina`, `BonoDiario`, `ConfiguracionBono`, `AjusteCaja`, `ConfirmacionPago`, `NotaAsistencia`, `Justificacion`, `Usuario`, `Sesion`.
- **FR-002**: El paquete DEBE exportar tipos de respuesta de API estandarizados: `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`.
- **FR-003**: El paquete DEBE exportar enums que reflejan los valores de los enums PostgreSQL: `RolUsuario`, `EstadoResultado`, `EstadoPeriodo`, `TipoAjusteCaja`, `TipoLineaNomina`.
- **FR-004**: El paquete NO DEBE tener dependencias de runtime (solo TypeScript types); su `package.json` no puede tener `dependencies`, solo `devDependencies`.

**`packages/utils` — Utilidades compartidas**

- **FR-005**: El paquete `@biometrico/utils` DEBE exportar `toCoT(date: Date | string): Date` que convierte cualquier fecha/timestamp a la zona horaria `America/Bogota` (UTC−5, sin DST).
- **FR-006**: El paquete DEBE exportar `formatBs(amount: number): string` que formata un número como monto en Bolívares con 2 decimales y separador de miles.
- **FR-007**: El paquete DEBE exportar `parsePeriodo(inicio: string, fin: string): { dias: Date[], semanaLabel: string }` para obtener los días de un período semanal y su representación de texto.
- **FR-008**: El paquete DEBE exportar `StorageService` o sus funciones equivalentes: `validateFile(file, config): void`, con configuración de tipos MIME permitidos y tamaño máximo. La configuración por defecto: tipos `['image/jpeg', 'image/png', 'application/pdf']`, tamaño máximo `10 * 1024 * 1024` bytes (10 MB).
- **FR-009**: El paquete DEBE exportar validadores de dominio: `isValidCodigoEmpleado(code: string): boolean`, `isPositiveBs(amount: number): boolean`, `isValidPeriodo(inicio: Date, fin: Date): boolean`.
- **FR-010**: Las utilidades DEBEN ser funciones puras sin efectos secundarios; no pueden importar ni usar clientes de base de datos, HTTP ni DOM.

**Configuración del workspace**

- **FR-011**: Ambos paquetes DEBEN estar configurados en el `turbo.json` del workspace para que sean incluidos en el pipeline de `typecheck`, `build` y `lint` global.
- **FR-012**: Las apps `frontend` y `backend` DEBEN referenciar los paquetes como `"@biometrico/types": "workspace:*"` y `"@biometrico/utils": "workspace:*"` en sus respectivos `package.json`.
- **FR-013**: El comando `turbo build` ejecutado desde la raíz DEBE construir los paquetes compartidos antes que las apps que los consumen (dependencia de build declarada en `turbo.json`).

### Key Entities

- **`packages/types`**: Paquete TypeScript puro (solo tipos e interfaces). Sin dependencias de runtime. Exporta el contrato entre frontend y backend.
- **`packages/utils`**: Paquete de utilidades con lógica pura reutilizable. Dependencia mínima de runtime (solo `date-fns` o equivalente para manejo de fechas).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un desarrollador puede agregar una nueva interfaz a `packages/types` y usarla en frontend y backend sin pasos adicionales de build manual, en menos de 2 minutos.
- **SC-002**: El 100% de las conversiones de fecha a COT en el sistema usan `toCoT()` de `@biometrico/utils`; ningún módulo reimplementa esta conversión.
- **SC-003**: El 100% de las cargas de archivos en el sistema pasan por las funciones de validación de `@biometrico/utils`; los límites de tipo y tamaño son consistentes.
- **SC-004**: El pipeline `turbo typecheck` detecta incompatibilidades de tipos entre frontend y backend en el 100% de los casos antes del merge a main.

## Assumptions

- Los paquetes usan el naming convention `@biometrico/[nombre]` como workspace-only packages; no se publican a ningún registro externo en v1.
- `packages/utils` usa `date-fns` (ya popular en el ecosistema React/Node) para manipulación de fechas; si ya está instalada en el workspace no requiere instalación adicional.
- Los tipos reflejan el schema de la base de datos pero no son generados automáticamente desde él (no se usa `supabase gen types` en v1 para mantener el control manual sobre los tipos públicos).
- La implementación real de la carga a Supabase Storage (credenciales, bucket names) vive en `apps/backend`; `packages/utils` solo contiene la lógica de validación pre-carga.
- Este paquete es prerequisito de implementación de todos los demás módulos. Debe completarse en la Fase 0 del plan de implementación antes que cualquier otra app.
