import { Controller, Post, Headers, Body, HttpCode, Req } from '@nestjs/common';
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
    // Always respond 200 — CrossChex retries on non-200 responses (FR-003)
    await this.webhooksService.handleCrossChex(req.rawBody, headers, body);
    return { code: '200', msg: 'success' };
  }
}
