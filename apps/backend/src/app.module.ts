import { Module } from '@nestjs/common';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AuthModule } from './auth/auth.module';
import { CsvImportModule } from './csv-import/csv-import.module';
import { RegistrosModule } from './registros/registros.module';

@Module({
  imports: [AuthModule, WebhooksModule, CsvImportModule, RegistrosModule],
})
export class AppModule {}
