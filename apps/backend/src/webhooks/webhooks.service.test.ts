import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';

const mockPool = { query: vi.fn() };

function makeService() {
  return new WebhooksService(mockPool as any);
}

function makePayload(overrides = {}) {
  return {
    requestId:  'REQ-001',
    deviceSn:   'C2Pro-ABC123',
    personId:   '5001',
    checkTime:  '2026-05-20T08:00:00Z',
    verifyType: 192,
    ...overrides,
  };
}

function signBody(body: object, secret: string): string {
  const raw = Buffer.from(JSON.stringify(body));
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

// ─── verifySignature ─────────────────────────────────────────────────────────

describe('WebhooksService.verifySignature', () => {
  const SECRET = 'test-secret';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('CROSSCHEX_WEBHOOK_SECRET', SECRET);
  });

  it('returns true for a valid HMAC signature', () => {
    const svc = makeService();
    const raw = Buffer.from('{"hello":"world"}');
    const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
    expect(svc.verifySignature(raw, sig)).toBe(true);
  });

  it('returns false for a wrong signature', () => {
    const svc = makeService();
    const raw = Buffer.from('{"hello":"world"}');
    expect(svc.verifySignature(raw, 'deadsignature00000000000000000000000000000000000000000000000000000')).toBe(false);
  });

  it('returns false when rawBody is undefined', () => {
    const svc = makeService();
    expect(svc.verifySignature(undefined, 'anything')).toBe(false);
  });

  it('returns false when signature is empty', () => {
    const svc = makeService();
    expect(svc.verifySignature(Buffer.from('{}'), '')).toBe(false);
  });

  it('returns true (permissive) when secret is not configured', () => {
    vi.stubEnv('CROSSCHEX_WEBHOOK_SECRET', '');
    const svc = makeService();
    expect(svc.verifySignature(Buffer.from('{}'), 'any')).toBe(true);
  });
});

// ─── handleCrossChex ─────────────────────────────────────────────────────────

describe('WebhooksService.handleCrossChex', () => {
  const SECRET = 'test-secret';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('CROSSCHEX_WEBHOOK_SECRET', SECRET);
  });

  it('rejects invalid signature — no DB calls except auditoria', async () => {
    const svc = makeService();
    const body = makePayload();
    const raw = Buffer.from(JSON.stringify(body));

    mockPool.query.mockResolvedValueOnce({ rows: [] }); // insertAuditoria

    const result = await svc.handleCrossChex(raw, { 'authorize-sign': 'bad-sig' }, body);
    expect(result.firmaValida).toBe(false);
    expect(result.resultado).toBeNull();
  });

  it('marks duplicado when id_solicitud_externo already exists', async () => {
    const svc = makeService();
    const body = makePayload();
    const raw = Buffer.from(JSON.stringify(body));
    const sig = signBody(body, SECRET);

    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'existing-uuid' }] }) // dup check
      .mockResolvedValueOnce({ rows: [] });                        // insertAuditoria

    const result = await svc.handleCrossChex(raw, { 'authorize-sign': sig }, body);
    expect(result.firmaValida).toBe(true);
    expect(result.resultado?.estado).toBe('duplicado');
  });

  it('marks fallido when colaborador not found', async () => {
    const svc = makeService();
    const body = makePayload();
    const raw = Buffer.from(JSON.stringify(body));
    const sig = signBody(body, SECRET);

    mockPool.query
      .mockResolvedValueOnce({ rows: [] })  // dup check — no dup
      .mockResolvedValueOnce({ rows: [] })  // colaborador not found
      .mockResolvedValueOnce({ rows: [] }); // insertAuditoria

    const result = await svc.handleCrossChex(raw, { 'authorize-sign': sig }, body);
    expect(result.resultado?.estado).toBe('fallido');
    expect(result.resultado?.motivo).toContain('colaborador no registrado');
  });

  it('marks fallido when dispositivo not found', async () => {
    const svc = makeService();
    const body = makePayload();
    const raw = Buffer.from(JSON.stringify(body));
    const sig = signBody(body, SECRET);

    mockPool.query
      .mockResolvedValueOnce({ rows: [] })                   // dup check
      .mockResolvedValueOnce({ rows: [{ id: 'col-uuid' }] }) // colaborador found
      .mockResolvedValueOnce({ rows: [] })                   // dispositivo not found
      .mockResolvedValueOnce({ rows: [] });                  // insertAuditoria

    const result = await svc.handleCrossChex(raw, { 'authorize-sign': sig }, body);
    expect(result.resultado?.estado).toBe('fallido');
    expect(result.resultado?.motivo).toContain('dispositivo no registrado');
  });

  it('returns procesado and inserts evento on happy path', async () => {
    const svc = makeService();
    const body = makePayload();
    const raw = Buffer.from(JSON.stringify(body));
    const sig = signBody(body, SECRET);

    mockPool.query
      .mockResolvedValueOnce({ rows: [] })                    // dup check
      .mockResolvedValueOnce({ rows: [{ id: 'col-uuid' }] }) // colaborador
      .mockResolvedValueOnce({ rows: [{ id: 'dev-uuid' }] }) // dispositivo
      .mockResolvedValueOnce({ rows: [] })                    // INSERT evento
      .mockResolvedValueOnce({ rows: [] });                   // insertAuditoria

    const result = await svc.handleCrossChex(raw, { 'authorize-sign': sig }, body);
    expect(result.firmaValida).toBe(true);
    expect(result.resultado?.estado).toBe('procesado');
    expect(result.resultado?.id_solicitud_externo).toBe('REQ-001');

    // Verify INSERT was called with correct origen
    const insertCall = mockPool.query.mock.calls[3];
    expect(insertCall[0]).toContain("'webhook'");
  });
});
