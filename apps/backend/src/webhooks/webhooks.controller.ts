import { Controller, Post, Headers, Body, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('crosschex')
  @HttpCode(200)
  async receiveCrossChex(
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
  ) {
    await this.webhooksService.handleCrossChex(headers, body);
    return { code: '200', msg: 'success' };
  }
}
