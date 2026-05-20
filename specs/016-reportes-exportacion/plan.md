# Implementation Plan: Reportes y Exportación

**Branch**: `016-reportes-exportacion` | **Date**: 2026-05-20 | **Spec**: [spec.md](spec.md)

## Summary

Generación al vuelo de reportes XLSX (nómina semanal, asistencia) y PDF (comprobante de pago
individual). Sin almacenamiento en servidor. Supervisor exporta su área; administrador exporta
todas las áreas; cajero y colaborador exportan su comprobante individual. Períodos borrador llevan
marca "PRELIMINAR". Generación < 30 segundos para 200 colaboradores.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20.x

**Primary Dependencies**:
- Backend: Express, `exceljs` (XLSX — licencia MIT, sin dependencias nativas), `@pdf-lib/pdf-lib`
  o `puppeteer` (PDF desde HTML template), `@biometrico/utils` (formatBs, toCoT)
- Frontend: Next.js 14, PrimeReact (`Button`, `Dropdown`, `Calendar`) — descarga via `window.open`
  o Blob URL

**Storage**: PostgreSQL — lectura de `resultados_nomina`, `lineas_resultado_nomina`, `bonos_diarios`,
`confirmaciones_pago`, `ajustes_caja`, `eventos_biometricos`, `justificaciones`, `notas_asistencia`

**Testing**: Vitest — tests de contenido del reporte (columnas, totales, marca PRELIMINAR),
tests de acceso por rol (supervisor solo su área), tests de generación sin datos

**Performance Goals**: Reporte de 200 colaboradores generado en < 30 segundos (SC-001)

**Constraints**:
- Reportes generados al vuelo, no almacenados en servidor (FR-013)
- XLSX para reportes tabulares; PDF para comprobantes (no intercambiables en v1)
- Comprobante solo generado para pagos confirmados (FR-008)
- Marca "PRELIMINAR" en encabezado de cada hoja para períodos borrador
- `exceljs` preferido sobre `xlsx` (SheetJS) por licencia y API async nativa

**Scale/Scope**: Reporte de nómina: 200 filas × ~10 columnas; comprobante: 1 página A4

## Constitution Check

| Principio | Aplica | Estado |
|-----------|--------|--------|
| II — Cálculo determinístico | Sí | ✅ Reporte es lectura de datos ya calculados; no recalcula |
| V — RBAC | Sí | ✅ Supervisor: su área; Admin: todo; Cajero: comprobante propio; Colaborador: su comprobante |
| VI — Trazabilidad | Sí | ✅ Comprobante incluye cajero, timestamp, monto y método de pago |
| VIII — Mobile-first | Sí | ✅ Descarga directa sin pantalla intermedia; PDF abre en viewer del dispositivo |
| IX — Simplicidad UX | Sí | ✅ Un botón "Exportar" por contexto; sin configuración de columnas en v1 |

**Gate**: ✅ Sin violaciones.

## Project Structure

### Source Code

```text
apps/backend/src/
└── reportes/
    ├── reportes.router.ts            # GET /reportes/nomina, /reportes/asistencia, /reportes/comprobante/:id
    ├── nomina.exporter.ts            # genera XLSX de nómina usando exceljs
    ├── asistencia.exporter.ts        # genera XLSX de asistencia
    ├── comprobante.exporter.ts       # genera PDF de comprobante de pago
    └── reportes.service.test.ts

apps/frontend/src/
└── components/reportes/
    ├── ExportarNominaButton.tsx       # botón + selector de período/área
    ├── ExportarAsistenciaButton.tsx
    └── DescargarComprobanteButton.tsx # usado en la vista de Caja y en historial del colaborador
```
