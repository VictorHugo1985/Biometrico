import { Module } from '@nestjs/common';
import { CrossChexController } from './crosschex.controller';
import { CrossChexService } from './crosschex.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CrossChexController],
  providers: [CrossChexService],
})
export class CrossChexModule {}
