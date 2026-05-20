import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PasswordService } from './password.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

// ─── PasswordService ──────────────────────────────────────────────────────────

describe('PasswordService', () => {
  let svc: PasswordService;

  beforeEach(() => {
    svc = new PasswordService();
  });

  it('hash produces a bcrypt string', async () => {
    const hashed = await svc.hash('pass123');
    expect(hashed).toMatch(/^\$2[ab]\$/);
  });

  it('verify returns true for correct password', async () => {
    const hashed = await svc.hash('pass123');
    expect(await svc.verify('pass123', hashed)).toBe(true);
  });

  it('verify returns false for wrong password', async () => {
    const hashed = await svc.hash('pass123');
    expect(await svc.verify('wrong', hashed)).toBe(false);
  });

  describe('validatePolicy', () => {
    it('accepts ≥8 chars with letter and digit', () => {
      expect(svc.validatePolicy('Pass1234')).toBe(true);
      expect(svc.validatePolicy('abcdefg1')).toBe(true);
    });

    it('rejects short passwords', () => {
      expect(svc.validatePolicy('Ab1')).toBe(false);
    });

    it('rejects passwords with only letters', () => {
      expect(svc.validatePolicy('abcdefghij')).toBe(false);
    });

    it('rejects passwords with only digits', () => {
      expect(svc.validatePolicy('12345678')).toBe(false);
    });
  });
});

// ─── AuthService login ────────────────────────────────────────────────────────

const mockPool = {
  query: vi.fn(),
};

const mockSessionService = {
  create: vi.fn(),
  invalidate: vi.fn(),
  invalidateAllForUser: vi.fn(),
};

const makeActiveUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'user-uuid',
  correo: 'admin@empresa.com',
  hash_contrasena: '',
  rol: 'administrador',
  activo: true,
  contrasena_temporal: false,
  ...overrides,
});

describe('AuthService.login', () => {
  let passwordSvc: PasswordService;
  let authSvc: AuthService;

  beforeEach(async () => {
    vi.resetAllMocks();  // clears queued mockResolvedValueOnce responses
    passwordSvc = new PasswordService();
    authSvc = new AuthService(mockPool as any, passwordSvc, mockSessionService as any);
  });

  it('returns token on valid credentials', async () => {
    const hashed = await passwordSvc.hash('Pass1234');
    const usuario = makeActiveUser({ hash_contrasena: hashed });

    mockPool.query
      .mockResolvedValueOnce({ rows: [usuario] })      // findUsuario
      .mockResolvedValueOnce({ rows: [] })              // recordLoginAttempt
      .mockResolvedValueOnce({ rows: [{ id: 'sid-1' }] }) // sessionService.create proxy
      .mockResolvedValueOnce({ rows: [] });             // UPDATE session hash

    mockSessionService.create.mockResolvedValueOnce('sid-1');

    const result = await authSvc.login(
      { correo: 'admin@empresa.com', contrasena: 'Pass1234' },
      '127.0.0.1',
    );

    expect(result.token).toBeTruthy();
    expect(result.usuario.rol).toBe('administrador');
    expect(result.usuario.contrasena_temporal).toBe(false);
  });

  it('throws UnauthorizedException for wrong password', async () => {
    const hashed = await passwordSvc.hash('correct');
    const usuario = makeActiveUser({ hash_contrasena: hashed });

    mockPool.query
      .mockResolvedValueOnce({ rows: [usuario] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      authSvc.login({ correo: 'admin@empresa.com', contrasena: 'wrong' }, '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when user not found', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      authSvc.login({ correo: 'noexiste@empresa.com', contrasena: 'Pass1234' }, '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException for inactive account', async () => {
    const hashed = await passwordSvc.hash('Pass1234');
    const usuario = makeActiveUser({ hash_contrasena: hashed, activo: false });

    mockPool.query
      .mockResolvedValueOnce({ rows: [usuario] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      authSvc.login({ correo: 'admin@empresa.com', contrasena: 'Pass1234' }, '127.0.0.1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('marks contrasena_temporal=true in response when set', async () => {
    const hashed = await passwordSvc.hash('Pass1234');
    const usuario = makeActiveUser({ hash_contrasena: hashed, contrasena_temporal: true });

    mockPool.query
      .mockResolvedValueOnce({ rows: [usuario] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    mockSessionService.create.mockResolvedValueOnce('sid-temp');

    const result = await authSvc.login(
      { correo: 'admin@empresa.com', contrasena: 'Pass1234' },
      '127.0.0.1',
    );

    expect(result.usuario.contrasena_temporal).toBe(true);
  });
});
