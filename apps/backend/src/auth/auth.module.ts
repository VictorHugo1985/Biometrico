import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Pool } from 'pg';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { RecoveryService } from './recovery.service';
import { DB_POOL } from './database.token';

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
});

@Module({
  controllers: [AuthController],
  providers: [
    { provide: DB_POOL, useValue: dbPool },
    PasswordService,
    SessionService,
    AuthService,
    RecoveryService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, PasswordService, { provide: DB_POOL, useValue: dbPool }],
})
export class AuthModule {}
