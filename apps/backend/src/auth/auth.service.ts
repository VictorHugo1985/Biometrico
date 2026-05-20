import { Injectable, Logger, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import * as jwt from 'jsonwebtoken';
import { DB_POOL } from './database.token';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { JWTPayload, LoginRequest, LoginResponse, UsuarioRow } from './auth.types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-prod';
const JWT_DEFAULT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '8h';
const REMEMBER_DAYS = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
  ) {}

  async login(
    dto: LoginRequest,
    ip?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    const usuario = await this.findUsuario(dto.correo);

    const credentialsValid =
      usuario !== null &&
      (await this.passwordService.verify(dto.contrasena, usuario.hash_contrasena));

    await this.recordLoginAttempt(dto.correo, usuario?.id ?? null, ip, credentialsValid);

    if (!credentialsValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciales incorrectas',
      });
    }

    if (!usuario.activo) {
      throw new ForbiddenException({
        code: 'ACCOUNT_INACTIVE',
        message: 'La cuenta está inactiva',
      });
    }

    const remember = dto.recordar === true;
    const expiresIn = remember ? `${REMEMBER_DAYS}d` : JWT_DEFAULT_EXPIRES;
    const expiresAt = new Date();
    if (remember) {
      expiresAt.setDate(expiresAt.getDate() + REMEMBER_DAYS);
    } else {
      expiresAt.setHours(expiresAt.getHours() + 8);
    }

    // Create a placeholder session to get the session ID first
    const tempToken = jwt.sign(
      { sub: usuario.id, correo: usuario.correo, rol: usuario.rol, sid: 'pending' },
      JWT_SECRET,
      { expiresIn } as jwt.SignOptions,
    );

    const sessionId = await this.sessionService.create(
      usuario.id,
      tempToken,
      expiresAt,
      ip,
      userAgent,
    );

    // Re-sign with the real session ID
    const token = jwt.sign(
      { sub: usuario.id, correo: usuario.correo, rol: usuario.rol, sid: sessionId },
      JWT_SECRET,
      { expiresIn } as jwt.SignOptions,
    );

    // Update session with the correct token hash
    await this.pool.query(
      `UPDATE sesiones_usuario
       SET hash_token = encode(digest($1, 'sha256'), 'hex')
       WHERE id = $2`,
      [token, sessionId],
    );

    this.logger.log(`Login exitoso: ${usuario.correo} (${usuario.rol}) sid=${sessionId}`);

    return {
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        contrasena_temporal: usuario.contrasena_temporal,
      },
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.invalidate(sessionId);
    this.logger.log(`Logout: sid=${sessionId}`);
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token inválido o expirado',
      });
    }
  }

  async changePassword(
    usuarioId: string,
    nuevaContrasena: string,
    esTemporal: boolean,
  ): Promise<void> {
    if (!this.passwordService.validatePolicy(nuevaContrasena)) {
      throw new Error('La contraseña no cumple los requisitos mínimos');
    }
    const hash = await this.passwordService.hash(nuevaContrasena);
    await this.pool.query(
      `UPDATE usuarios
       SET hash_contrasena = $1,
           contrasena_temporal = false,
           actualizado_en = NOW()
       WHERE id = $2`,
      [hash, usuarioId],
    );
    // Invalidar todas las sesiones activas (excepto si es post-reset propio)
    if (!esTemporal) {
      await this.sessionService.invalidateAllForUser(usuarioId);
    }
  }

  private async findUsuario(correo: string): Promise<UsuarioRow | null> {
    const result = await this.pool.query<UsuarioRow>(
      `SELECT id, correo, hash_contrasena, rol, activo, contrasena_temporal
       FROM usuarios
       WHERE correo = $1`,
      [correo.toLowerCase().trim()],
    );
    return result.rows[0] ?? null;
  }

  private async recordLoginAttempt(
    correo: string,
    usuarioId: string | null,
    ip: string | undefined,
    exitoso: boolean,
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO intentos_login (usuario_id, correo_intentado, direccion_ip, exitoso)
         VALUES ($1, $2, $3, $4)`,
        [usuarioId, correo, ip ?? null, exitoso],
      );
    } catch (err) {
      this.logger.warn(`No se pudo registrar intento de login: ${(err as Error).message}`);
    }
  }
}
