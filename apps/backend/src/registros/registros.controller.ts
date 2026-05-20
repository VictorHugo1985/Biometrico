import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/auth.guard';
import { RegistrosService, RegistrosFiltros } from './registros.service';

@Controller('registros')
export class RegistrosController {
  constructor(private readonly registrosService: RegistrosService) {}

  @Get()
  @Roles('administrador', 'supervisor')
  async listar(
    @Query('colaborador_id') colaboradorId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    const filtros: RegistrosFiltros = {
      colaborador_id: colaboradorId,
      desde,
      hasta,
      estado,
      page:      page ? parseInt(page, 10) : undefined,
      page_size: pageSize ? parseInt(pageSize, 10) : undefined,
    };
    return this.registrosService.listar(filtros);
  }
}
