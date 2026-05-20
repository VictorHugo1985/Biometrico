import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RecoveryService } from './recovery.service';
import { LoginRequest } from './auth.types';
import { Public } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly recoveryService: RecoveryService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginRequest,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(body, ip, userAgent);

    const isProd = process.env.NODE_ENV === 'production';
    const maxAge = body.recordar ? 30 * 24 * 60 * 60 * 1000 : undefined;

    res.cookie('biometrico_token', result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge,
    });

    return { data: result, message: 'Login exitoso' };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = req.jwtPayload;
    if (payload?.sid) {
      await this.authService.logout(payload.sid);
    }
    res.clearCookie('biometrico_token');
    return { data: null, message: 'Sesión cerrada' };
  }

  @Public()
  @Post('recuperar')
  @HttpCode(200)
  async requestRecovery(@Body() body: { correo: string }) {
    if (!body.correo) {
      throw new BadRequestException({ code: 'MISSING_FIELD', message: 'El correo es requerido' });
    }
    await this.recoveryService.requestReset(body.correo);
    return {
      data: null,
      message: 'Si el correo está registrado, recibirás las instrucciones',
    };
  }

  @Public()
  @Post('recuperar/confirmar')
  @HttpCode(200)
  async confirmRecovery(
    @Body() body: { token: string; nueva_contrasena: string },
  ) {
    if (!body.token || !body.nueva_contrasena) {
      throw new BadRequestException({
        code: 'MISSING_FIELD',
        message: 'Token y nueva contraseña son requeridos',
      });
    }
    await this.recoveryService.confirmReset(body.token, body.nueva_contrasena);
    return {
      data: null,
      message: 'Contraseña actualizada. Por favor inicia sesión nuevamente.',
    };
  }
}
