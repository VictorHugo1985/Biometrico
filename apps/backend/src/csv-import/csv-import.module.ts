import { Module } from '@nestjs/common';
import { CsvImportController } from './csv-import.controller';
import { CsvImportService } from './csv-import.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CsvImportController],
  providers: [CsvImportService],
})
export class CsvImportModule {}
