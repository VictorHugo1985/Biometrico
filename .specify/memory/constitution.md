<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.3.0
Added: Principio IX — Simplicidad de la Experiencia de Usuario
Rationale: el sistema debe minimizar la fricción en tareas frecuentes; la complejidad en UI debe justificarse por necesidad de negocio.
Templates requiring updates:
  - .specify/templates/plan-template.md ⚠ pending — verify RBAC sections include Caja
Deferred TODOs: none
-->

# Biometrico Constitution

## Core Principles

### I. Inmutabilidad del Registro Biométrico

Los eventos biométricos capturados son registros de auditoría de solo escritura (append-only).
Ningún evento biométrico existente DEBE ser modificado ni eliminado directamente.
Toda corrección DEBE realizarse mediante entradas de ajuste explícitas que referencien el evento original.
El historial completo de eventos DEBE ser siempre reconstruible desde la base de datos.

### II. Cálculo Determinístico y Auditable

Toda liquidación de horas (ordinarias, extras) y bonos (transporte, alimentación) DEBE producir
el mismo resultado dado el mismo conjunto de entradas en cualquier momento.
Los bonos de transporte y alimentación son parte del alcance v1 y DEBEN incluirse en la spec de
liquidación semanal (spec 007) antes de su planificación técnica.
Cada cálculo de pago DEBE dejar una traza de auditoría que vincule: eventos biométricos de entrada,
reglas de negocio aplicadas (versión vigente), y monto resultante.
Recalcular el pago de un colaborador para cualquier semana cerrada DEBE ser posible en cualquier momento.

### III. Reglas de Negocio Configurables (NO NEGOCIABLE)

Los horarios, tarifas por hora, umbrales de hora extra, rangos de bonos y descuentos DEBEN ser
configurables por colaborador o por departamento/área (grupo); ninguna regla de negocio puede estar
hardcodeada en el código. Un colaborador hereda las reglas de su departamento con posibilidad de
override individual; el departamento es la entidad canónica de agrupación de reglas.
Cada cambio de configuración DEBE ser versionado con fecha de vigencia, de modo que el cálculo
de semanas pasadas use siempre la configuración vigente en ese período.

### IV. Ciclo de Pago Semanal como Unidad Primaria

La semana laboral es la unidad fundamental de negocio del sistema.
Todas las agregaciones, cierres, reportes y pagos se orientan al ciclo semanal.
El sistema DEBE soportar múltiples semanas abiertas en paralelo solo si es estrictamente necesario;
la regla por defecto es una semana activa y el resto cerradas e inmutables.

### V. Control de Acceso Basado en Roles (RBAC)

Cuatro roles fijos definen los límites de acceso:
- **Administrador**: acceso total — configuración, cierre de semana, aprobación de liquidaciones y pagos. Puede actuar en nombre de cualquier otro rol.
- **Supervisor**: visibilidad de lectura sobre todas las áreas (dashboard, registros biométricos); acciones de escritura (justificaciones, ajustes, confirmación de bonos) restringidas al equipo/departamento que tiene asignado.
- **Caja**: gestión de pagos — recibe consolidados aprobados por el supervisor, puede agregar ajustes (descuentos e incrementos con motivo obligatorio) y confirma el pago efectivo. Sin acceso a configuración de liquidación, registros biométricos ni gestión de colaboradores.
- **Colaborador**: autoservicio de solo lectura — su propio historial, marcaciones, bonos y estado de pago.

Ninguna operación de escritura sensible (ajuste, cierre, pago) DEBE ejecutarse sin verificación de rol.

### VI. Trazabilidad Obligatoria de Ajustes y Justificaciones

Todo ajuste manual, justificación de ausencia, descuento o modificación de marcación DEBE registrar:
usuario que lo realizó, timestamp, motivo documentado, y referencia al evento o período afectado.
Las justificaciones y ajustes que afecten el pago DEBEN requerir aprobación de un rol superior.
No existe ajuste anónimo ni sin motivo en el sistema.

### VII. Disponibilidad de Asistencia en Tiempo Real

La vista de asistencia en línea DEBE reflejar los eventos biométricos con una latencia máxima
aceptable para operación en vivo (objetivo: menos de 60 segundos desde el evento al dashboard).
El sistema NO DEBE depender exclusivamente de procesamiento batch para las vistas de asistencia activa.
Las vistas históricas cerradas pueden ser batch; las vistas en curso DEBEN ser reactivas.

### VIII. Diseño Mobile-First

El sistema DEBE diseñarse con enfoque **mobile-first**: toda pantalla y flujo se diseña primero para dispositivos móviles (viewport ≥ 320 px) y luego se adapta progresivamente a pantallas más grandes (tablet y escritorio).

Ninguna vista del sistema puede ser exclusiva de escritorio. Las vistas de **dashboard de asistencia**, **administración de colaboradores**, **liquidación semanal**, **bonos**, **pago por Caja** y el **autoservicio del colaborador** DEBEN ser completamente funcionales y usables en dispositivos móviles sin degradación de funcionalidad.

Los componentes de interfaz DEBEN adaptarse al tamaño de pantalla disponible: tablas largas colapsan a tarjetas o listas en móvil; formularios se presentan en columna única; acciones críticas son accesibles sin scroll horizontal.

### IX. Simplicidad de la Experiencia de Usuario

El sistema DEBE minimizar la fricción en las tareas frecuentes. Cada flujo principal — registrar asistencia, generar liquidación, confirmar pago, consultar bonos — DEBE completarse en el menor número de pasos posible sin sacrificar trazabilidad ni control.

Los formularios DEBEN proveer valores predeterminados sensatos donde el sistema pueda inferirlos; el usuario solo ingresa datos que el sistema genuinamente no puede determinar. Las opciones avanzadas o de uso poco frecuente DEBEN estar disponibles pero ocultas por defecto (divulgación progresiva).

Los mensajes de error DEBEN ser accionables: indicar qué ocurrió y qué debe hacer el usuario para resolverlo. No se mostrarán trazas técnicas, códigos de error internos ni terminología del sistema al usuario final.

Las acciones irreversibles (aprobar liquidación, confirmar pago, dar de baja a un colaborador) DEBEN requerir confirmación explícita con descripción clara de las consecuencias. Las acciones reversibles NO DEBEN requerir confirmación redundante.

La interfaz DEBE usar el vocabulario del negocio: colaborador, período, liquidación, bono, caja. No se expondrán términos técnicos de infraestructura al usuario.

Toda complejidad adicional en la UI (wizards, modales en cascada, tablas anidadas, flujos de más de 3 pasos) DEBE justificarse por una necesidad de negocio documentada en la spec correspondiente. La complejidad sin justificación es rechazada.

## Restricciones Tecnológicas y de Seguridad

- El sistema se entrega como **aplicación web** accesible desde navegador moderno, con diseño responsive mobile-first (Principio VIII).
- Los datos de nómina y biométricos son información sensible: DEBEN transmitirse y almacenarse cifrados.
- La aplicación DEBE tolerar picos de eventos biométricos concurrentes sin pérdida de registros
  (por ejemplo, entrada/salida masiva al inicio y fin de turno).
- Toda comunicación entre frontend y backend DEBE autenticarse con tokens de sesión; no hay
  endpoints de escritura anónimos.
- Las migraciones de base de datos DEBEN ser reversibles (up/down); ningún deploy puede dejar
  la base en estado inconsistente.

## Flujo de Desarrollo

- Toda lógica de cálculo de pago (horas, extras, bonos, descuentos) DEBE contar con tests unitarios
  que cubran los escenarios: entrada normal, hora extra, bono de transporte, bono de alimentación,
  semana incompleta, ajuste manual.
- Las interfaces de usuario DEBEN ser validadas manualmente en navegador antes de considerar
  una historia de usuario completada.
- Las reglas de negocio configurables DEBEN ser testeadas con configuraciones variables
  (no solo con valores por defecto).
- Cada PR DEBE referenciar la historia de usuario o principio constitucional que satisface.

## Gobernanza

Esta constitución es el documento rector del proyecto Biometrico y tiene precedencia sobre
cualquier otra guía técnica o decisión de diseño.
Toda enmienda DEBE:
1. Incrementar la versión según semántica (MAJOR: cambio de principio o eliminación;
   MINOR: nuevo principio o sección; PATCH: clarificación o redacción).
2. Documentar el motivo del cambio.
3. Actualizar la fecha de última enmienda.

Todo PR o decisión de implementación relevante DEBE verificar cumplimiento con los principios I–IX
antes de ser aprobado.
La complejidad adicional DEBE justificarse explícitamente contra un principio constitucional;
la complejidad sin justificación es rechazada.

**Version**: 1.3.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-20
