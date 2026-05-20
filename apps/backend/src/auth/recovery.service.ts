import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { DB_POOL } from './database.token';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
  ) {}

  async requestReset(correo: string): Promise<void> {
    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM usuarios WHERE correo = $1 AND activo = true`,
      [correo.toLowerCase().trim()],
    );
    if (result.rows.length === 0) {
      // Respuesta genérica — no revelar si el correo existe (spec FR-006 / Principio IX)
      return;
    }
    const usuarioId = result.rows[0].id;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutos

    // Invalidar tokens previos pendientes
    await this.pool.query(
      `UPDATE tokens_recuperacion SET estado = 'expirado'
       WHERE usuario_id = $1 AND estado = 'pendiente'`,
      [usuarioId],
    );

    await this.pool.query(
      `INSERT INTO tokens_recuperacion (usuario_id, hash_token, expira_en)
       VALUES ($1, $2, $3)`,
      [usuarioId, hashToken, expiresAt],
    );

    await this.sendResetEmail(correo, rawToken);
  }

  async confirmReset(rawToken: string, nuevaContrasena: string): Promise<void> {
    if (!this.passwordService.validatePolicy(nuevaContrasena)) {
      throw new BadRequestException({
        code: 'WEAK_PASSWORD',
        message: 'La contraseña debe tener al menos 8 caracteres, una letra y un número',
      });
    }

    const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const result = await this.pool.query<{ id: string; usuario_id: string }>(
      `SELECT id, usuario_id FROM tokens_recuperacion
       WHERE hash_token = $1 AND estado = 'pendiente' AND expira_en > NOW()`,
      [hashToken],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'El enlace no es válido o ha expirado',
      });
    }

    const { id: tokenId, usuario_id: usuarioId } = result.rows[0];
    const newHash = await this.passwordService.hash(nuevaContrasena);

    await this.pool.query(
      `UPDATE tokens_recuperacion SET estado = 'usado', usado_en = NOW() WHERE id = $1`,
      [tokenId],
    );

    await this.pool.query(
      `UPDATE usuarios
       SET hash_contrasena = $1, contrasena_temporal = false, actualizado_en = NOW()
       WHERE id = $2`,
      [newHash, usuarioId],
    );

    await this.sessionService.invalidateAllForUser(usuarioId);
    this.logger.log(`Contraseña restablecida para usuario ${usuarioId}`);
  }

  private async sendResetEmail(correo: string, rawToken: string): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetUrl = `${baseUrl}/recuperar-contrasena?token=${rawToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? 'no-reply@biometrico.local',
        to: correo,
        subject: 'Recuperación de contraseña — Biometrico',
        text: `Para restablecer tu contraseña, accede a: ${resetUrl}\n\nEste enlace expira en 60 minutos.`,
        html: `<p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
               <p><a href="${resetUrl}">Restablecer contraseña</a></p>
               <p>Este enlace expira en 60 minutos.</p>`,
      });
    } catch (err) {
      // No exponer errores de SMTP al cliente
      this.logger.error(`Error enviando email de recuperación a ${correo}: ${(err as Error).message}`);
    }
  }
}
