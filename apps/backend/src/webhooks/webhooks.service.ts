import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class WebhooksService implements OnModuleDestroy {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }

  async handleCrossChex(headers: Record<string, string>, body: unknown): Promise<void> {
    // Express lowercases all header names
    const requestId = headers['requestid'];
    const authorizeSign = headers['authorize-sign'];
    const nameSpace = headers['namespace'];
    const nameAction = headers['nameaction'];

    const isValidSignature = this.validateSignature(authorizeSign);

    if (!isValidSignature) {
      this.logger.warn(
        `Webhook rechazado — firma inválida | requestId: ${requestId} | authorize-sign: ${authorizeSign}`,
      );
    } else {
      this.logger.log(
        `Webhook recibido | requestId: ${requestId} | nameSpace: ${nameSpace} | nameAction: ${nameAction}`,
      );
    }

    await this.persistAuditoria(requestId, headers, body, isValidSignature);
  }

  private validateSignature(receivedSign: string): boolean {
    const secret = process.env.CROSSCHEX_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('CROSSCHEX_WEBHOOK_SECRET no configurado — omitiendo validación de firma');
      return true;
    }
    return receivedSign === secret;
  }

  private async persistAuditoria(
    requestId: string,
    headers: Record<string, string>,
    body: unknown,
    firmaValida: boolean,
  ): Promise<void> {
    const estado = firmaValida ? 'procesado' : 'rechazado';
    try {
      await this.pool.query(
        `INSERT INTO auditoria_webhooks
           (id_solicitud_crosschex, recibido_en, cabeceras, payload, firma_valida, estado_procesamiento)
         VALUES ($1, NOW(), $2, $3, $4, $5)`,
        [
          requestId ?? null,
          JSON.stringify(headers),
          body ? JSON.stringify(body) : null,
          firmaValida,
          estado,
        ],
      );
    } catch (err) {
      // La tabla puede no existir todavía (migraciones pendientes)
      this.logger.error(`No se pudo persistir en auditoria_webhooks: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
