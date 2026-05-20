import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import { DB_POOL } from './database.token';

export interface SessionRow {
  id: string;
  usuario_id: string;
  estado: 'activo' | 'expirado' | 'cerrado';
  expira_en: Date;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async create(
    usuarioId: string,
    token: string,
    expiresAt: Date,
    ip?: string,
    userAgent?: string,
  ): Promise<string> {
    const hashToken = this.hashToken(token);
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO sesiones_usuario
         (usuario_id, hash_token, expira_en, direccion_ip, info_dispositivo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [usuarioId, hashToken, expiresAt, ip ?? null, userAgent ?? null],
    );
    return result.rows[0].id;
  }

  async findActive(sessionId: string): Promise<SessionRow | null> {
    const result = await this.pool.query<SessionRow>(
      `SELECT id, usuario_id, estado, expira_en
       FROM sesiones_usuario
       WHERE id = $1 AND estado = 'activo' AND expira_en > NOW()`,
      [sessionId],
    );
    return result.rows[0] ?? null;
  }

  async invalidate(sessionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE sesiones_usuario
       SET estado = 'cerrado', cerrado_en = NOW()
       WHERE id = $1`,
      [sessionId],
    );
  }

  async invalidateAllForUser(usuarioId: string): Promise<void> {
    await this.pool.query(
      `UPDATE sesiones_usuario
       SET estado = 'expirado'
       WHERE usuario_id = $1 AND estado = 'activo'`,
      [usuarioId],
    );
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
