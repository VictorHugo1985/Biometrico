import { Injectable, Logger, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { DB_POOL } from '../auth/database.token';
import { CrossChexPayload, EventoResult } from './webhooks.types';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async handleCrossChex(
    rawBody: Buffer | undefined,
    headers: Record<string, string>,
    body: CrossChexPayload,
  ): Promise<{ firmaValida: boolean; resultado: EventoResult | null }> {
    const requestId = headers['requestid'] ?? body?.requestId ?? null;
    const authorizeSign = headers['authorize-sign'] ?? '';

    const firmaValida = this.verifySignature(rawBody, authorizeSign);

    if (!firmaValida) {
      this.logger.warn(`Webhook rechazado — firma inválida | requestId: ${requestId}`);
      await this.insertAuditoria(requestId, headers, body, false, 'rechazado', 'Firma HMAC inválida', null);
      return { firmaValida: false, resultado: null };
    }

    this.logger.log(`Webhook recibido | requestId: ${requestId}`);
    const resultado = await this.procesarEvento(requestId, body);
    await this.insertAuditoria(
      requestId,
      headers,
      body,
      true,
      resultado.estado,
      resultado.motivo ?? null,
      null,
    );
    return { firmaValida: true, resultado };
  }

  verifySignature(_rawBody: Buffer | undefined, received: string): boolean {
    const secret = process.env.CROSSCHEX_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('CROSSCHEX_WEBHOOK_SECRET no configurado — aceptando todas las firmas');
      return true;
    }
    if (!received) return false;
    try {
      const a = Buffer.from(secret);
      const b = Buffer.from(received);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private async procesarEvento(requestId: string | null, body: CrossChexPayload): Promise<EventoResult> {
    const idExterno = requestId ?? `wh-${body.deviceSn}-${body.checkTime}`;

    const dupCheck = await this.pool.query<{ id: string }>(
      `SELECT id FROM eventos_biometricos WHERE id_solicitud_externo = $1`,
      [idExterno],
    );
    if (dupCheck.rows.length > 0) {
      return { id_solicitud_externo: idExterno, estado: 'duplicado' };
    }

    const colResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM colaboradores WHERE codigo_empleado = $1 AND activo = true`,
      [body.personId],
    );
    if (colResult.rows.length === 0) {
      return {
        id_solicitud_externo: idExterno,
        estado: 'fallido',
        motivo: `colaborador no registrado: workno ${body.personId}`,
      };
    }

    const devResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM dispositivos_biometricos WHERE numero_serie = $1`,
      [body.deviceSn],
    );
    if (devResult.rows.length === 0) {
      return {
        id_solicitud_externo: idExterno,
        estado: 'fallido',
        motivo: `dispositivo no registrado: sn ${body.deviceSn}`,
      };
    }

    try {
      await this.pool.query(
        `INSERT INTO eventos_biometricos
           (id_solicitud_externo, colaborador_id, dispositivo_id, codigo_tipo_verificacion,
            hora_marcacion, origen, payload_crudo)
         VALUES ($1, $2, $3, $4, $5, 'webhook', $6)`,
        [
          idExterno,
          colResult.rows[0].id,
          devResult.rows[0].id,
          body.verifyType,
          new Date(body.checkTime),
          JSON.stringify(body),
        ],
      );
    } catch (err) {
      this.logger.error(`Insert eventos_biometricos failed: ${(err as Error).message}`);
      return { id_solicitud_externo: idExterno, estado: 'fallido', motivo: 'error interno al guardar' };
    }

    return { id_solicitud_externo: idExterno, estado: 'procesado' };
  }

  private async insertAuditoria(
    requestId: string | null,
    headers: Record<string, string>,
    payload: unknown,
    firmaValida: boolean,
    estado: string,
    notas: string | null,
    eventoId: string | null,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO auditoria_webhooks
           (id_solicitud_crosschex, recibido_en, cabeceras, payload,
            firma_valida, estado_procesamiento, notas_procesamiento, evento_biometrico_id)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)`,
        [
          requestId,
          JSON.stringify(headers),
          JSON.stringify(payload),
          firmaValida,
          estado,
          notas,
          eventoId,
        ],
      );
    } catch (err) {
      this.logger.error(`auditoria_webhooks insert failed: ${(err as Error).message}`);
    }
  }
}
