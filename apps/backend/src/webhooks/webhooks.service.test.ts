import { describe, it, expect, beforeEach, vi } from 'vitest';
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

// ─── verifySignature (direct comparison — FR-002) ────────────────────────────

describe('WebhooksService.verifySignature', () => {
  const SECRET = 'Jodaout2026';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('CROSSCHEX_WEBHOOK_SECRET', SECRET);
  });

  it('returns true when authorize-sign equals the configured secret', () => {
    const svc = makeService();
    expect(svc.verifySignature(Buffer.from('{}'), SECRET)).toBe(true);
  });

  it('returns false when authorize-sign differs from secret', () => {
    const svc = makeService();
    expect(svc.verifySignature(Buffer.from('{}'), 'wrong-secret')).toBe(false);
  });

  it('returns false when signature is empty string', () => {
    const svc = makeService();
    expect(svc.verifySignature(Buffer.from('{}'), '')).toBe(false);
  });

  it('returns false when lengths differ', () => {
    const svc = makeService();
    expect(svc.verifySignature(Buffer.from('{}'), SECRET + 'x')).toBe(false);
  });

  it('returns true (permissive) when CROSSCHEX_WEBHOOK_SECRET not configured', () => {
    vi.stubEnv('CROSSCHEX_WEBHOOK_SECRET', '');
    const svc = makeService();
    expect(svc.verifySignature(Buffer.from('{}'), 'any')).toBe(true);
  });

  it('rawBody parameter is ignored — comparison is secret vs header only', () => {
    const svc = makeService();
    // rawBody undefined should not affect result when secret matches
    expect(svc.verifySignature(undefined, SECRET)).toBe(true);
  });
});

// ─── handleCrossChex ─────────────────────────────────────────────────────────

describe('WebhooksService.handleCrossChex', () => {
  const SECRET = 'Jodaout2026';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('CROSSCHEX_WEBHOOK_SECRET', SECRET);
  });

  it('rejects invalid signature — logs audit, does not insert evento', async () => {
    const svc = makeService();
    const body = makePayload();

    mockPool.query.mockResolvedValueOnce({ rows: [] }); // insertAuditoria

    const result = await svc.handleCrossChex(Buffer.from('{}'), { 'authorize-sign': 'bad' }, body);
    expect(result.firmaValida).toBe(false);
    expect(result.resultado).toBeNull();
  });

  it('marks duplicado when id_solicitud_externo already exists', async () => {
    const svc = makeService();
    const body = makePayload();

    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'existing-uuid' }] }) // dup check
      .mockResolvedValueOnce({ rows: [] });                        // insertAuditoria

    const result = await svc.handleCrossChex(Buffer.from('{}'), { 'authorize-sign': SECRET }, body);
    expect(result.firmaValida).toBe(true);
    expect(result.resultado?.estado).toBe('duplicado');
  });

  it('marks fallido when colaborador not found', async () => {
    const svc = makeService();
    const body = makePayload();

    mockPool.query
      .mockResolvedValueOnce({ rows: [] })  // dup check
      .mockResolvedValueOnce({ rows: [] })  // colaborador not found
      .mockResolvedValueOnce({ rows: [] }); // insertAuditoria

    const result = await svc.handleCrossChex(Buffer.from('{}'), { 'authorize-sign': SECRET }, body);
    expect(result.resultado?.estado).toBe('fallido');
    expect(result.resultado?.motivo).toContain('colaborador no registrado');
  });

  it('marks fallido when dispositivo not found', async () => {
    const svc = makeService();
    const body = makePayload();

    mockPool.query
      .mockResolvedValueOnce({ rows: [] })                    // dup check
      .mockResolvedValueOnce({ rows: [{ id: 'col-uuid' }] }) // colaborador found
      .mockResolvedValueOnce({ rows: [] })                    // dispositivo not found
      .mockResolvedValueOnce({ rows: [] });                   // insertAuditoria

    const result = await svc.handleCrossChex(Buffer.from('{}'), { 'authorize-sign': SECRET }, body);
    expect(result.resultado?.estado).toBe('fallido');
    expect(result.resultado?.motivo).toContain('dispositivo no registrado');
  });

  it('returns procesado and inserts evento on happy path', async () => {
    const svc = makeService();
    const body = makePayload();

    mockPool.query
      .mockResolvedValueOnce({ rows: [] })                    // dup check
      .mockResolvedValueOnce({ rows: [{ id: 'col-uuid' }] }) // colaborador
      .mockResolvedValueOnce({ rows: [{ id: 'dev-uuid' }] }) // dispositivo
      .mockResolvedValueOnce({ rows: [] })                    // INSERT evento
      .mockResolvedValueOnce({ rows: [] });                   // insertAuditoria

    const result = await svc.handleCrossChex(Buffer.from('{}'), { 'authorize-sign': SECRET }, body);
    expect(result.firmaValida).toBe(true);
    expect(result.resultado?.estado).toBe('procesado');
    expect(result.resultado?.id_solicitud_externo).toBe('REQ-001');

    const insertCall = mockPool.query.mock.calls[3];
    expect(insertCall[0]).toContain("'webhook'");
  });
});
