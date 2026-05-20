import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
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
    @Query('origen') origen?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    const filtros: RegistrosFiltros = {
      colaborador_id: colaboradorId,
      desde,
      hasta,
      estado,
      origen,
      page:      page ? parseInt(page, 10) : undefined,
      page_size: pageSize ? parseInt(pageSize, 10) : undefined,
    };
    return this.registrosService.listar(filtros);
  }

  @Get(':id')
  @Roles('administrador', 'supervisor')
  async detalle(@Param('id') id: string) {
    const registro = await this.registrosService.findById(id);
    if (!registro) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
    return { data: registro };
  }
}
