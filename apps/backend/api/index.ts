import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import * as express from 'express';
import { IncomingMessage, ServerResponse } from 'http';

const expressApp = express();
const adapter = new ExpressAdapter(expressApp);
let initialized = false;

async function bootstrap() {
  if (!initialized) {
    const app = await NestFactory.create(AppModule, adapter, { logger: false });
    await app.init();
    initialized = true;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await bootstrap();
  expressApp(req as any, res as any);
}
