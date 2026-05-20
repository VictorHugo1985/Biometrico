# Quickstart: Usar @biometrico/types y @biometrico/utils

## Prerrequisitos

- Turborepo configurado en la raíz del monorepo
- `packages/types` y `packages/utils` construidos (o en modo dev con `turbo dev`)

## Instalación en una app del workspace

Agregar en el `package.json` de `apps/backend` o `apps/frontend`:

```json
{
  "dependencies": {
    "@biometrico/types": "workspace:*",
    "@biometrico/utils": "workspace:*"
  }
}
```

Ejecutar `pnpm install` (o `npm install`) desde la raíz del monorepo para que el workspace resuelva los paquetes locales.

## Uso básico

### Tipos compartidos

```typescript
// apps/backend/src/colaboradores/colaboradores.service.ts
import { Colaborador, ApiResponse } from '@biometrico/types';

function getColaborador(id: string): Promise<ApiResponse<Colaborador>> {
  // TypeScript valida que el objeto retornado cumple la interfaz Colaborador
}
```

```typescript
// apps/frontend/src/pages/colaboradores/index.tsx
import { Colaborador, RolUsuario } from '@biometrico/types';

const isAdmin = (rol: RolUsuario) => rol === RolUsuario.Administrador;
```

### Fechas en Colombia (COT)

```typescript
import { toCoT, parsePeriodo } from '@biometrico/utils';

// Convertir timestamp del biométrico a hora colombiana
const horaLocal = toCoT(evento.hora_marcacion);
console.log(horaLocal.toISOString()); // 2026-05-20T03:00:00-05:00

// Obtener los días de un período semanal para mostrar en UI
const { dias, semanaLabel } = parsePeriodo('2026-05-16', '2026-05-22');
// dias → [Date(sáb), Date(dom), ..., Date(vie)]
// semanaLabel → "Sem. 21 · 16–22 may 2026"
```

### Moneda

```typescript
import { formatBs } from '@biometrico/utils';

// En componente de resumen de liquidación
const texto = formatBs(resultado.totalBruto); // "1.250,00 Bs"
```

### Validación de archivos (pre-upload)

```typescript
import { validateFile, StorageError } from '@biometrico/utils';

// En apps/backend, antes de llamar a Supabase Storage
try {
  validateFile({ name: file.originalname, type: file.mimetype, size: file.size });
  await supabase.storage.from('adjuntos').upload(path, buffer);
} catch (err) {
  if (err.message === StorageError.FILE_TOO_LARGE) {
    return res.status(400).json({ code: 'FILE_TOO_LARGE', message: 'El archivo supera el límite de 10 MB' });
  }
  if (err.message === StorageError.INVALID_MIME) {
    return res.status(400).json({ code: 'INVALID_MIME_TYPE', message: 'Tipo de archivo no permitido' });
  }
}
```

### Validadores de dominio

```typescript
import { isValidCodigoEmpleado } from '@biometrico/utils';

// En formulario de alta de colaborador (frontend o backend)
if (!isValidCodigoEmpleado(form.codigoEmpleado)) {
  throw new Error('Código de empleado inválido');
}
```

## Agregar una nueva interfaz

1. Crear o editar el archivo apropiado en `packages/types/src/`
2. Re-exportar desde `packages/types/src/index.ts`
3. Ejecutar `turbo typecheck` — cualquier uso incompatible aparece como error de compilación
4. El cambio está disponible en ambas apps sin pasos adicionales de build manual

## Scripts disponibles

```bash
# Desde la raíz del monorepo
turbo typecheck          # Verifica tipos en packages/ y apps/
turbo build              # Construye packages/ antes que apps/
turbo test --filter=@biometrico/utils  # Tests del paquete utils
```
