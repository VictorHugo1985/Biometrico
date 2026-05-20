import { Module } from '@nestjs/common';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuthModule } from './auth/auth.module';
import { CsvImportModule } from './csv-import/csv-import.module';
import { RegistrosModule } from './registros/registros.module';
import { CrossChexModule } from './crosschex/crosschex.module';

@Module({
  imports: [AuthModule, WebhooksModule, CsvImportModule, RegistrosModule, CrossChexModule],
})
export class AppModule {}
