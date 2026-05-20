import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { JWTPayload } from './auth.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

declare module 'express' {
  interface Request {
    jwtPayload?: JWTPayload;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({ code: 'NO_TOKEN', message: 'Token requerido' });
    }

    const payload = this.authService.verifyToken(token);
    const session = await this.sessionService.findActive(payload.sid);

    if (!session) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'La sesión ha expirado. Por favor inicia sesión nuevamente.',
      });
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(payload.rol)) {
        throw new UnauthorizedException({
          code: 'FORBIDDEN',
          message: 'No tienes permiso para realizar esta acción',
        });
      }
    }

    request.jwtPayload = payload;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // Cookie fallback (set by login endpoint)
    const cookieToken = (request as any).cookies?.auth_token as string | undefined;
    return cookieToken ?? null;
  }
}
