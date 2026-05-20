import { Controller, Post, Get, Body, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Roles } from '../auth/auth.guard';
import { CrossChexService } from './crosschex.service';

interface SyncBody {
  begin_time?: string;
  end_time?:   string;
  workno?:     string;
}

@Controller('crosschex')
export class CrossChexController {
  constructor(private readonly crosschexService: CrossChexService) {}

  @Post('sync')
  @Roles('administrador')
  async sync(@Body() body: SyncBody) {
    if (!body.begin_time || !body.end_time) {
      throw new BadRequestException({
        code:    'MISSING_PARAMS',
        message: 'begin_time y end_time son requeridos',
      });
    }

    try {
      const result = await this.crosschexService.syncHistorico(
        body.begin_time,
        body.end_time,
        body.workno,
      );
      return { data: result, message: 'Sincronización completada' };
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('HTTP') || msg.includes('requeridos')) {
        throw new ServiceUnavailableException({
          code:    'CROSSCHEX_UNAVAILABLE',
          message: 'No se pudo conectar con CrossChex Cloud',
        });
      }
      throw err;
    }
  }

  @Get('status')
  @Roles('administrador')
  status() {
    return { data: this.crosschexService.getStatus() };
  }
}
