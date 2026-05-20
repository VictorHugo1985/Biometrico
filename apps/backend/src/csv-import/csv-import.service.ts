import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../auth/database.token';
import { parseCSV } from './csv-import.parser';
import { CSVImportResult } from '../webhooks/webhooks.types';

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async importCSV(buffer: Buffer): Promise<CSVImportResult> {
    let parsed;
    try {
      parsed = parseCSV(buffer);
    } catch (err) {
      if ((err as Error).message === 'IMPORT_TOO_LARGE') {
        throw new BadRequestException({
          code: 'IMPORT_TOO_LARGE',
          message: 'El archivo supera el límite de 5.000 filas',
        });
      }
      throw err;
    }

    const result: CSVImportResult = {
      total:     parsed.rows.length + parsed.errors.length,
      procesados: 0,
      duplicados: 0,
      fallidos:   parsed.errors.length,
      errores:    [...parsed.errors],
    };

    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const fila = i + 2;

      const dup = await this.pool.query<{ id: string }>(
        `SELECT id FROM eventos_biometricos WHERE id_solicitud_externo = $1`,
        [row.idSolicitudExterno],
      );
      if (dup.rows.length > 0) {
        result.duplicados++;
        continue;
      }

      const colResult = await this.pool.query<{ id: string }>(
        `SELECT id FROM colaboradores WHERE codigo_empleado = $1 AND activo = true`,
        [row.codigoEmpleado],
      );
      if (colResult.rows.length === 0) {
        result.fallidos++;
        result.errores.push({ fila, motivo: `colaborador no registrado: workno ${row.codigoEmpleado}` });
        continue;
      }

      const devResult = await this.pool.query<{ id: string }>(
        `SELECT id FROM dispositivos_biometricos WHERE nombre = $1`,
        [row.deviceName],
      );
      if (devResult.rows.length === 0) {
        result.fallidos++;
        result.errores.push({ fila, motivo: `dispositivo no registrado: '${row.deviceName}'` });
        continue;
      }

      try {
        await this.pool.query(
          `INSERT INTO eventos_biometricos
             (id_solicitud_externo, colaborador_id, dispositivo_id, codigo_tipo_verificacion,
              hora_marcacion, origen, payload_crudo)
           VALUES ($1, $2, $3, $4, $5, 'sincronizacion_api', $6)`,
          [
            row.idSolicitudExterno,
            colResult.rows[0].id,
            devResult.rows[0].id,
            row.verifyCode,
            row.checkTime,
            JSON.stringify(row.rawRow),
          ],
        );
        result.procesados++;
      } catch (err) {
        this.logger.error(`CSV fila ${fila} insert failed: ${(err as Error).message}`);
        result.fallidos++;
        result.errores.push({ fila, motivo: 'error interno al guardar' });
      }
    }

    this.logger.log(
      `CSV import completado: ${result.procesados} procesados, ${result.duplicados} duplicados, ${result.fallidos} fallidos`,
    );
    return result;
  }
}
