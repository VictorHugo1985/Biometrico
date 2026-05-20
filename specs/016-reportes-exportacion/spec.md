# Feature Specification: Reportes y Exportación

**Feature Branch**: `016-reportes-exportacion`

**Created**: 2026-05-20

**Status**: Draft

**Input**: Necesidad identificada en revisión de backlog: supervisores, cajeros y administradores necesitan exportar resúmenes de nómina y comprobantes de pago para gerencia, contabilidad y entrega a colaboradores.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exportar reporte de nómina semanal (Priority: P1)

El supervisor o administrador genera un reporte del período semanal seleccionado con el detalle de horas, bonos y totales de todos los colaboradores de su área (o de todas las áreas para el administrador). Lo descarga como archivo para compartir con gerencia o contabilidad.

**Why this priority**: El reporte de nómina es el documento de trabajo externo al sistema; sin él, la información calculada queda atrapada en la pantalla y no puede ser revisada fuera del sistema ni archivada.

**Independent Test**: El supervisor selecciona la semana del 16 al 22 de mayo, elige exportar el área ACABADO y descarga un archivo. El archivo contiene una fila por colaborador con: nombre, horas ordinarias, horas extras, bonos confirmados, total calculado y estado de pago.

**Acceptance Scenarios**:

1. **Given** el supervisor selecciona un período semanal y su área, **When** solicita el reporte, **Then** el sistema genera un archivo descargable con una fila por colaborador que incluye: nombre, área, horas ordinarias, horas extras, bono transporte, bono alimentación, descuentos, total bruto y estado de pago.
2. **Given** el administrador selecciona un período y elige "todas las áreas", **When** solicita el reporte, **Then** el archivo incluye todos los colaboradores del sistema organizados por área.
3. **Given** el período seleccionado está en estado "borrador" (no aprobado), **When** se genera el reporte, **Then** el archivo incluye una marca visible de "PRELIMINAR — sujeto a cambios".
4. **Given** el período seleccionado no tiene ningún colaborador con datos calculados, **When** se solicita el reporte, **Then** el sistema informa que no hay datos disponibles para ese período y área.

---

### User Story 2 - Exportar comprobante de pago individual (Priority: P1)

El cajero o administrador genera el comprobante de pago de un colaborador para un período específico, una vez que el pago fue confirmado. El comprobante incluye el desglose completo y los datos de la confirmación de pago.

**Why this priority**: El comprobante es el documento que se entrega al colaborador como constancia de lo que recibió. Es un requisito operativo básico de cualquier sistema de nómina.

**Independent Test**: El cajero abre el consolidado pagado de un colaborador y descarga el comprobante. El documento incluye: nombre del colaborador, período, desglose de horas y bonos, ajustes de Caja, monto pagado, fecha de pago y método.

**Acceptance Scenarios**:

1. **Given** un consolidado con pago confirmado, **When** el cajero solicita el comprobante, **Then** el sistema genera un documento con: encabezado de la empresa, nombre del colaborador, período, desglose de conceptos, monto pagado, fecha y método de pago.
2. **Given** un consolidado sin confirmación de pago, **When** se intenta generar el comprobante, **Then** el sistema informa que el pago aún no ha sido confirmado y no genera el documento.
3. **Given** el colaborador consulta su historial de pagos, **When** selecciona un período pagado, **Then** puede descargar su propio comprobante de pago.

---

### User Story 3 - Reporte resumen de pagos por período (Priority: P2)

El administrador genera un resumen ejecutivo de todos los pagos realizados en un período: total pagado por área, cantidad de colaboradores pagados, total de ajustes de Caja y diferencias entre lo calculado y lo pagado efectivamente.

**Why this priority**: El resumen ejecutivo es la vista de control de la gerencia; permite detectar inconsistencias entre lo calculado por el sistema y lo pagado en efectivo.

**Independent Test**: El administrador selecciona el mes de mayo y obtiene un resumen con: total pagado por área, número de colaboradores, suma de ajustes de Caja y monto total de diferencias registradas.

**Acceptance Scenarios**:

1. **Given** el administrador selecciona un rango de fechas, **When** solicita el reporte resumen, **Then** el sistema muestra totales agrupados por área: colaboradores pagados, total calculado, total ajustes Caja, total pagado efectivo.
2. **Given** el reporte resumen, **When** hay diferencias entre el total calculado y el total pagado, **Then** esas diferencias aparecen resaltadas con el monto y el porcentaje de variación.
3. **Given** el administrador exporta el reporte resumen, **When** descarga el archivo, **Then** incluye una pestaña o sección de detalle con cada comprobante individual del período.

---

### User Story 4 - Reporte de asistencia (Priority: P2)

El supervisor genera un reporte de asistencia del período para su área: qué días trabajó cada colaborador, cuántas horas, ausencias justificadas y ausencias injustificadas. Útil para control interno y para presentar a RR.HH.

**Acceptance Scenarios**:

1. **Given** el supervisor selecciona un período y su área, **When** solicita el reporte de asistencia, **Then** el archivo incluye una fila por colaborador-día con: fecha, estado (presente/ausente justificado/ausente injustificado), horas trabajadas y marcaciones.
2. **Given** el reporte de asistencia, **When** hay días con notas o adjuntos registrados, **Then** el archivo incluye el texto del comentario (pero no el adjunto, por tamaño).

---

### Edge Cases

- ¿Qué formato de archivo se genera? → PDF para comprobantes individuales; Excel (XLSX) para reportes tabulares. El usuario no puede elegir el formato en v1.
- ¿Pueden generarse reportes de períodos muy antiguos? → Sí, mientras los datos existan en el sistema. No hay límite de antigüedad en v1.
- ¿Cuánto tarda en generarse un reporte con 200 colaboradores? → El sistema debe generar el archivo en menos de 30 segundos. Si supera ese tiempo, informa al usuario y permite descargar cuando esté listo.
- ¿Los reportes incluyen los datos de los colaboradores dados de baja? → Sí, si tenían datos en el período seleccionado.
- ¿Puede el colaborador descargar el reporte de toda su área? → No; el colaborador solo puede descargar su propio comprobante individual.

## Requirements *(mandatory)*

### Functional Requirements

**Reporte de nómina semanal**

- **FR-001**: El supervisor DEBE poder generar el reporte de nómina de su área para cualquier período semanal seleccionado. El administrador puede generar el reporte de todas las áreas o una específica.
- **FR-002**: El reporte de nómina DEBE incluir por colaborador: nombre, área, horas ordinarias, horas extras, bono de transporte, bono de alimentación, descuentos, ajustes del supervisor, total bruto y estado de pago.
- **FR-003**: Los períodos en estado "borrador" DEBEN incluir una marca de agua o indicador "PRELIMINAR" en el reporte generado.
- **FR-004**: El formato de exportación del reporte de nómina es XLSX (Excel). El archivo DEBE tener una hoja por área cuando se exportan múltiples áreas.

**Comprobante de pago individual**

- **FR-005**: El cajero y el administrador DEBEN poder generar el comprobante de pago para cualquier consolidado confirmado como pagado. El colaborador puede generar su propio comprobante.
- **FR-006**: El comprobante DEBE incluir: nombre del colaborador, área, período, desglose de conceptos (horas ordinarias, extras, bonos, descuentos, ajustes de Caja), monto pagado, fecha de pago, método de pago y nombre del cajero.
- **FR-007**: El formato del comprobante es PDF. El sistema DEBE generar el PDF directamente sin requerir software adicional del usuario.
- **FR-008**: Solo se puede generar comprobante si el pago fue confirmado; para períodos no pagados el sistema no genera el documento.

**Reporte resumen**

- **FR-009**: El administrador DEBE poder generar un reporte resumen de pagos por rango de fechas (no limitado a una sola semana) con totales por área.
- **FR-010**: El reporte resumen DEBE mostrar diferencias entre el total calculado por el sistema y el total efectivamente pagado, indicando monto y porcentaje de variación.

**Reporte de asistencia**

- **FR-011**: El supervisor DEBE poder exportar el reporte de asistencia de su área para el período seleccionado con detalle día a día por colaborador.

**General**

- **FR-012**: El sistema DEBE generar cualquier reporte en menos de 30 segundos para hasta 200 colaboradores. Si el proceso tarda más, DEBE notificar al usuario y proveer el archivo cuando esté disponible.
- **FR-013**: Los reportes generados no se almacenan en el servidor; se generan al vuelo y se descargan directamente. No existe un historial de reportes generados en v1.

### Key Entities

- **Reporte de Nómina**: Exportación tabular (XLSX) del período de liquidación; agrega datos de `resultados_nomina` y `lineas_resultado_nomina`.
- **Comprobante de Pago**: Documento formal (PDF) que certifica el pago realizado a un colaborador; combina datos de `resultados_nomina`, `ajustes_caja` y `confirmaciones_pago`.
- **Reporte de Asistencia**: Exportación tabular (XLSX) de los eventos biométricos y justificaciones por período.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El supervisor puede generar y descargar el reporte de nómina de su área para una semana en menos de 30 segundos.
- **SC-002**: El comprobante de pago generado coincide en el 100% de los casos con los datos registrados en el sistema (sin discrepancias de redondeo o cálculo).
- **SC-003**: El colaborador puede descargar su comprobante de pago en menos de 10 segundos desde que lo solicita.
- **SC-004**: El 100% de los reportes de períodos "borrador" incluyen la marca "PRELIMINAR" visible sin necesidad de leer el cuerpo del documento.

## Assumptions

- El formato PDF para comprobantes y XLSX para reportes tabulares es la elección para v1; otros formatos (CSV, ODS) quedan fuera del alcance.
- Los reportes se generan al vuelo y no se almacenan en el servidor; si el usuario necesita el mismo reporte dos veces, lo genera de nuevo. El almacenamiento de reportes históricos es v2.
- La librería de generación de documentos (PDF y XLSX) se selecciona en la fase de planificación técnica; la spec no impone restricciones de implementación.
- El encabezado del comprobante (logo, nombre de la empresa, dirección) se configura por el administrador en la configuración general del sistema, no cubierta en esta spec.
- Los reportes de asistencia incluyen el texto de los comentarios del registro diario (spec 011) pero no los archivos adjuntos.
