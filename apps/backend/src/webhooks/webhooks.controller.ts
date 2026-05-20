import {
  Controller,
  Post,
  Headers,
  Body,
  HttpCode,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/auth.guard';
import { WebhooksService } from './webhooks.service';
import { CrossChexPayload } from './webhooks.types';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('crosschex')
  @HttpCode(200)
  async receiveCrossChex(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() body: CrossChexPayload,
  ) {
    const { firmaValida } = await this.webhooksService.handleCrossChex(req.rawBody, headers, body);
    if (!firmaValida) {
      throw new UnauthorizedException({ code: '401', msg: 'invalid signature' });
    }
    return { code: '200', msg: 'success' };
  }
}
