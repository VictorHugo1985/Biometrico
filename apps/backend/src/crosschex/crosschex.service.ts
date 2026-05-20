import { Injectable, Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';
import { DB_POOL } from '../auth/database.token';
import {
  CrossChexAuthRequest,
  CrossChexAuthResponse,
  CrossChexRecord,
  CrossChexRecordsRequest,
  CrossChexRecordsResponse,
  SyncResult,
} from './crosschex.types';

const PER_PAGE = 1000;
const TOKEN_RENEWAL_BUFFER_MS = 5 * 60 * 1000; // renew 5 min before expiry

@Injectable()
export class CrossChexService {
  private readonly logger = new Logger(CrossChexService.name);
  private tokenCache: { token: string; expiresAt: Date } | null = null;

  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  async syncHistorico(
    beginTime: string,
    endTime: string,
    workno?: string,
  ): Promise<SyncResult> {
    const token = await this.getToken();
    const result: SyncResult = { total: 0, procesados: 0, duplicados: 0, fallidos: 0, errores: [] };

    let page = 1;
    let pageCount = 1;

    do {
      const response = await this.fetchRecords(token, beginTime, endTime, page, workno);
      const payload = response.data.payload;
      pageCount = payload.pageCount;

      for (const record of payload.list) {
        result.total++;
        await this.processRecord(record, result);
      }

      page++;
    } while (page <= pageCount);

    this.logger.log(
      `Sync completado [${beginTime} → ${endTime}]: ${result.procesados} procesados, ` +
      `${result.duplicados} duplicados, ${result.fallidos} fallidos`,
    );
    return result;
  }

  getStatus(): { tokenActivo: boolean; tokenExpiraEn: string | null; apiKeyConfigurado: boolean; apiSecretConfigurado: boolean } {
    return {
      tokenActivo:         this.tokenCache !== null && this.tokenCache.expiresAt > new Date(),
      tokenExpiraEn:       this.tokenCache?.expiresAt.toISOString() ?? null,
      apiKeyConfigurado:   !!process.env.CROSSCHEX_API_KEY,
      apiSecretConfigurado: !!process.env.CROSSCHEX_API_SECRET,
    };
  }

  // ─── Token management ──────────────────────────────────────────────────────

  async getToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt.getTime() - TOKEN_RENEWAL_BUFFER_MS > Date.now()) {
      return this.tokenCache.token;
    }
    return this.authenticate();
  }

  async authenticate(): Promise<string> {
    const apiKey    = process.env.CROSSCHEX_API_KEY;
    const apiSecret = process.env.CROSSCHEX_API_SECRET;
    const baseUrl   = process.env.CROSSCHEX_API_BASE_URL ?? 'https://api.ap.crosschexcloud.com/';

    if (!apiKey || !apiSecret) {
      throw new Error('CROSSCHEX_API_KEY y CROSSCHEX_API_SECRET son requeridos');
    }

    const body: CrossChexAuthRequest = {
      header: {
        nameSpace:  'authorize.token',
        nameAction: 'token',
        version:    '1.0',
        requestId:  randomUUID(),
        timestamp:  new Date().toISOString(),
      },
      payload: { api_key: apiKey, api_secret: apiSecret },
    };

    const response = await fetch(baseUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`CrossChex auth failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as CrossChexAuthResponse;
    if (data.code !== 200) {
      throw new Error(`CrossChex auth error: code ${data.code}`);
    }

    const token     = data.data.payload.token;
    const expiresAt = new Date(data.data.payload.expires);
    this.tokenCache = { token, expiresAt };
    this.logger.log(`Token CrossChex renovado, expira: ${expiresAt.toISOString()}`);
    return token;
  }

  // ─── Records fetch ─────────────────────────────────────────────────────────

  private async fetchRecords(
    token: string,
    beginTime: string,
    endTime: string,
    page: number,
    workno?: string,
  ): Promise<CrossChexRecordsResponse> {
    const baseUrl = process.env.CROSSCHEX_API_BASE_URL ?? 'https://api.ap.crosschexcloud.com/';

    const body: CrossChexRecordsRequest = {
      header: {
        nameSpace:  'attendance.record',
        nameAction: 'getrecord',
        version:    '1.0',
        requestId:  randomUUID(),
        timestamp:  new Date().toISOString(),
      },
      authorize: { type: 'token', token },
      payload: {
        begin_time: beginTime,
        end_time:   endTime,
        order:      'asc',
        page,
        per_page:   PER_PAGE,
        ...(workno ? { workno } : {}),
      },
    };

    const response = await fetch(baseUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`CrossChex getrecord failed: HTTP ${response.status}`);
    }

    const data = (await response.json()) as CrossChexRecordsResponse;
    if (data.code !== 200) {
      throw new Error(`CrossChex getrecord error: code ${data.code}`);
    }
    return data;
  }

  // ─── Record processing ─────────────────────────────────────────────────────

  private async processRecord(record: CrossChexRecord, result: SyncResult): Promise<void> {
    const idExterno = `api-${record.device.serial_number}-${new Date(record.checktime).toISOString()}`;

    const dup = await this.pool.query<{ id: string }>(
      `SELECT id FROM eventos_biometricos WHERE id_solicitud_externo = $1`,
      [idExterno],
    );
    if (dup.rows.length > 0) {
      result.duplicados++;
      return;
    }

    const colResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM colaboradores WHERE codigo_empleado = $1 AND activo = true`,
      [record.employee.workno],
    );
    if (colResult.rows.length === 0) {
      result.fallidos++;
      result.errores.push({ registro: idExterno, motivo: `colaborador no registrado: workno ${record.employee.workno}` });
      return;
    }

    const devResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM dispositivos_biometricos WHERE numero_serie = $1`,
      [record.device.serial_number],
    );
    if (devResult.rows.length === 0) {
      result.fallidos++;
      result.errores.push({ registro: idExterno, motivo: `dispositivo no registrado: sn ${record.device.serial_number}` });
      return;
    }

    try {
      await this.pool.query(
        `INSERT INTO eventos_biometricos
           (id_solicitud_externo, colaborador_id, dispositivo_id, codigo_tipo_verificacion,
            hora_marcacion, origen, payload_crudo)
         VALUES ($1, $2, $3, $4, $5, 'sincronizacion_api', $6)`,
        [
          idExterno,
          colResult.rows[0].id,
          devResult.rows[0].id,
          record.checktype,
          new Date(record.checktime),
          JSON.stringify(record),
        ],
      );
      result.procesados++;
    } catch (err) {
      this.logger.error(`Insert failed for ${idExterno}: ${(err as Error).message}`);
      result.fallidos++;
      result.errores.push({ registro: idExterno, motivo: 'error interno al guardar' });
    }
  }
}
