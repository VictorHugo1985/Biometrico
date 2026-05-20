import { Module } from '@nestjs/common';
import { RegistrosController } from './registros.controller';
import { RegistrosService } from './registros.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RegistrosController],
  providers: [RegistrosService],
})
export class RegistrosModule {}
