import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/auth.guard';
import { CsvImportService } from './csv-import.service';

@Controller('registros')
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) {}

  @Post('import')
  @Roles('administrador')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  async importCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({ code: 'NO_FILE', message: 'Se requiere un archivo CSV' });
    }
    const result = await this.csvImportService.importCSV(file.buffer);
    return { data: result, message: 'Importación completada' };
  }
}
