# Feature Specification: Ingesta de Registros Biométricos (Webhook + CSV) y Vista de Registros

**Feature Branch**: `009-ingesta-biometrico`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "los medios de obtención de registros biométricos puede ser mediante webhooks y csv de importación en la vista de registros readonly de biometrico"

## Clarifications

### Session 2026-05-19

- Q: ¿Cuáles son las columnas reales del CSV de CrossChex Cloud? → A: Formato estándar: `No.`, `Employee ID`, `Employee Name`, `Department`, `Check Time`, `State` (código numérico), `Device Name`. Sin columna UUID.
- Q: ¿Cómo vincular el dispositivo al importar desde CSV? → A: Buscar por nombre exacto en `dispositivos_biometricos.nombre`; si no coincide, la fila queda "fallida" con motivo "dispositivo no registrado".
- Q: ¿Cómo manejar archivos CSV muy grandes? → A: Límite de 5 000 filas por importación; si se excede el sistema rechaza el archivo con mensaje claro antes de procesarlo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar registros biométricos (Priority: P1)

El administrador o supervisor accede a la vista de registros biométricos y puede consultar el historial completo de todas las marcaciones recibidas, independientemente de su origen (webhook automático o importación manual desde CSV). Puede filtrar por colaborador, rango de fechas o estado del registro.

**Why this priority**: Antes de introducir la importación CSV, el sistema necesita una vista unificada que reúna todos los eventos de cualquier fuente. Es la pantalla de auditoría y diagnóstico central del módulo biométrico.

**Independent Test**: Se puede probar de forma aislada con datos existentes, verificando que los registros aparecen con su fuente correcta (webhook/csv) y que los filtros reducen la lista correctamente.

**Acceptance Scenarios**:

1. **Given** existen registros biométricos de distintas fuentes, **When** el administrador accede a la vista, **Then** ve la lista ordenada por fecha descendente con: colaborador, hora, tipo de verificación, dispositivo, fuente (Webhook / CSV) y estado (procesado / fallido / duplicado).
2. **Given** el administrador aplica un filtro por colaborador y rango de fechas, **When** confirma el filtro, **Then** la lista muestra solo los registros que coinciden.
3. **Given** el administrador hace clic en un registro, **When** accede al detalle, **Then** ve el payload completo recibido (cabeceras del webhook o fila original del CSV) y las notas de procesamiento si las hay.
4. **Given** la vista está abierta, **When** el administrador aplica un filtro por estado "fallido", **Then** ve solo los registros que no pudieron vincularse a un colaborador o dispositivo registrado, con el motivo del fallo.

---

### User Story 2 - Importar registros desde CSV de CrossChex (Priority: P1)

Cuando el dispositivo biométrico no pudo enviar eventos por webhook (corte de red, falla temporal) o se necesita cargar datos históricos, el administrador exporta el reporte de marcaciones desde CrossChex Cloud en formato CSV y lo importa desde la vista de registros biométricos.

**Why this priority**: El webhook cubre el flujo en tiempo real, pero inevitablemente habrá períodos sin conexión o backfills de datos históricos. Sin importación CSV el sistema queda ciego a esas marcaciones.

**Independent Test**: Se puede probar de forma aislada subiendo un CSV válido con marcaciones de colaboradores registrados y verificando que los registros aparecen como "procesado" en la vista, y que un segundo intento con el mismo CSV genera "duplicado" sin crear registros adicionales.

**Acceptance Scenarios**:

1. **Given** el administrador tiene un archivo CSV exportado desde CrossChex, **When** lo carga en la vista de registros, **Then** el sistema muestra una previsualización con: total de filas detectadas, filas válidas, filas con errores de formato y filas duplicadas (ya existentes).
2. **Given** la previsualización está confirmada, **When** el administrador ejecuta la importación, **Then** el sistema procesa cada fila: inserta las nuevas como "procesado", marca las duplicadas como "duplicado" y registra las fallidas con el motivo del error.
3. **Given** el CSV contiene una fila con un workno que no existe en el sistema, **When** se procesa, **Then** esa fila se registra con estado "fallido" y motivo "colaborador no registrado", sin interrumpir el resto de la importación.
4. **Given** el CSV contiene una fila con formato inválido (columnas faltantes o fecha mal formada), **When** se procesa, **Then** esa fila se rechaza con descripción del error de formato, sin afectar las filas válidas.
5. **Given** el administrador carga el mismo CSV dos veces, **When** se procesa la segunda importación, **Then** todas las filas aparecen como "duplicado" y no se crea ningún registro nuevo.

---

### User Story 3 - Ver resumen y descargar reporte de importación (Priority: P2)

Tras completar una importación CSV, el administrador ve un resumen: cuántos registros se importaron correctamente, cuántos eran duplicados y cuántos fallaron. Puede descargar un reporte de los errores para corregirlos.

**Why this priority**: Sin retroalimentación clara el administrador no sabe si la importación fue exitosa ni puede identificar qué colaboradores o dispositivos faltan por registrar.

**Independent Test**: Se puede probar verificando que el resumen post-importación refleja exactamente los conteos correctos para un CSV de prueba con casos mixtos.

**Acceptance Scenarios**:

1. **Given** la importación finalizó, **When** el administrador ve el resumen, **Then** se muestra: total procesado, importados exitosamente, duplicados omitidos y fallidos con motivo agrupado.
2. **Given** existen filas con errores, **When** el administrador descarga el reporte de errores, **Then** recibe el CSV original con una columna adicional indicando el motivo del fallo de cada fila afectada.

---

### Edge Cases

- ¿Qué ocurre si el archivo CSV tiene decenas de miles de filas? ¿Hay un límite de tamaño de archivo?
- ¿Qué sucede si el proceso de importación se interrumpe a mitad (cierre de navegador, error de red)?
- ¿Puede importarse un CSV con registros de fechas dentro de un período de liquidación ya aprobado?
- ¿Qué ocurre si el CSV tiene el mismo registro que ya llegó por webhook (mismo UUID o misma combinación workno+datetime)?

## Requirements *(mandatory)*

### Functional Requirements

**Vista de registros**

- **FR-001**: La vista de registros biométricos DEBE mostrar todos los eventos del sistema en orden cronológico descendente, con: nombre del colaborador, fecha y hora, tipo de verificación, dispositivo, fuente (Webhook / CSV) y estado (procesado / fallido / duplicado).
- **FR-002**: La vista DEBE ser de solo lectura; no se permite editar ni eliminar registros individuales desde esta pantalla.
- **FR-003**: El usuario DEBE poder filtrar registros por: colaborador, rango de fechas, fuente (Webhook / CSV) y estado.
- **FR-004**: Al seleccionar un registro, el sistema DEBE mostrar el detalle completo: datos originales recibidos (payload o fila CSV) y notas de procesamiento.
- **FR-005**: La vista DEBE incluir el botón de acceso a la importación CSV accesible para el rol administrador.

**Importación CSV**

- **FR-006**: El sistema DEBE aceptar archivos CSV exportados desde CrossChex Cloud con las columnas estándar confirmadas: `No.`, `Employee ID` (workno), `Employee Name`, `Department`, `Check Time` (fecha y hora de marcación), `State` (código numérico de verificación) y `Device Name`. No se incluye columna UUID.
- **FR-007**: El sistema DEBE rechazar cualquier archivo CSV que supere las 5 000 filas antes de procesarlo, mostrando un mensaje claro que indique el límite y cuántas filas tiene el archivo cargado.
- **FR-007b**: Dentro del límite de 5 000 filas, el sistema DEBE mostrar una previsualización con: total de filas, filas válidas, filas con error de formato y filas duplicadas (detectadas por combinación `Employee ID + Check Time` exacto).
- **FR-008**: La importación DEBE ser idempotente: importar el mismo CSV dos veces no debe crear registros duplicados.
- **FR-009**: La importación DEBE procesar cada fila de forma independiente; un error en una fila NO debe interrumpir el procesamiento de las demás.
- **FR-010**: Los registros importados desde CSV DEBEN pasar por el mismo proceso de vinculación que los webhooks: búsqueda del colaborador por `Employee ID` (workno) y búsqueda del dispositivo por coincidencia exacta de `Device Name` con el campo `nombre` de la tabla de dispositivos registrados.
- **FR-011**: Los registros fallidos (colaborador o dispositivo no encontrado) DEBEN registrarse con estado "fallido" y el motivo, igual que los webhooks fallidos.
- **FR-012**: Al finalizar la importación, el sistema DEBE mostrar un resumen: importados correctamente, duplicados omitidos y fallidos con motivo agrupado.
- **FR-013**: El sistema DEBE permitir descargar un reporte CSV de los registros fallidos con el motivo del error adjunto por fila.
- **FR-014**: Solo el rol **administrador** DEBE poder ejecutar importaciones CSV; los supervisores pueden ver la vista de registros pero no importar.

### Key Entities

- **Registro Biométrico**: Evento de marcación de un colaborador; tiene fuente (webhook / csv_importacion), estado (procesado / fallido / duplicado), datos originales y notas de procesamiento. Es la misma entidad independientemente del canal de ingesta.
- **Importación CSV**: Proceso de carga de un lote de registros desde archivo; tiene fecha de ejecución, usuario que la ejecutó, nombre del archivo y conteos de resultado (importados / duplicados / fallidos).
- **Fila de Importación**: Cada línea del CSV procesada; tiene estado individual y motivo de error si aplica.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un CSV con hasta 5 000 filas se procesa completamente (previsualización + importación) en menos de 60 segundos.
- **SC-002**: El administrador puede completar una importación CSV (cargar archivo → previsualizar → confirmar → ver resumen) en menos de 3 minutos.
- **SC-003**: La importación del mismo CSV dos veces no produce ningún registro duplicado en el sistema (0 duplicados creados).
- **SC-004**: El 100% de las filas con error incluye un motivo legible en el reporte descargable, sin mensajes técnicos crípticos.
- **SC-005**: Los registros importados por CSV son visibles en la vista de registros inmediatamente después de completar la importación.
- **SC-006**: Un error en cualquier fila individual no interrumpe el procesamiento de las demás; la tasa de procesamiento parcial fallido no afecta los registros válidos restantes.

## Assumptions

- El formato CSV estándar de exportación de CrossChex Cloud incluye al menos: código de empleado (workno), fecha y hora de marcación, tipo de verificación (código numérico) y nombre del dispositivo. Si el formato real difiere, se ajustará durante la planificación técnica.
- La idempotencia para registros CSV se garantiza por la combinación `Employee ID (workno) + Check Time (exacto al segundo)` como clave de deduplicación, ya que el CSV estándar de CrossChex no incluye UUID. Para webhooks se sigue usando el `uuid` del payload.
- El límite de importación es de 5 000 filas por archivo. Los archivos que superen este límite son rechazados antes de ser procesados; el administrador debe dividirlos en lotes.
- Los registros importados por CSV tienen exactamente el mismo comportamiento de vinculación que los webhooks: requieren que el colaborador (por workno) y el dispositivo (por nombre o serial) estén previamente registrados en el sistema.
- La vista de registros biométricos unifica en una sola pantalla tanto los eventos recibidos por webhook como los importados por CSV; no hay pantallas separadas por fuente.
- Importar registros de fechas dentro de un período de liquidación ya aprobado está permitido técnicamente, pero el sistema debe notificar que esos registros no afectarán la liquidación cerrada.
- El módulo de autenticación (spec 004) es una dependencia; la vista y la importación requieren sesión activa con rol habilitado.
