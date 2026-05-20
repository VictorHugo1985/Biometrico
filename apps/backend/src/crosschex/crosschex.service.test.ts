import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CrossChexService } from './crosschex.service';

const mockPool = { query: vi.fn() };

function makeService() {
  return new CrossChexService(mockPool as any);
}

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.mock.token';
const MOCK_EXPIRES = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days

function mockAuthFetch() {
  return {
    ok: true,
    json: async () => ({
      code: 200,
      data: { payload: { token: MOCK_TOKEN, expires: MOCK_EXPIRES } },
    }),
  };
}

function mockRecordsFetch(list: object[], page = 1, pageCount = 1) {
  return {
    ok: true,
    json: async () => ({
      code: 200,
      data: {
        payload: { count: list.length, list, page, perPage: 1000, pageCount },
      },
    }),
  };
}

function makeRecord(workno = '5001', serial = 'SN001', checktime = '2026-05-20T08:00:00Z') {
  return {
    checktype: 192,
    checktime,
    device:    { serial_number: serial, name: 'Reloj Principal' },
    employee:  { first_name: 'Juan', last_name: 'Pérez', workno },
  };
}

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('CrossChexService.authenticate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('CROSSCHEX_API_KEY', 'test-key');
    vi.stubEnv('CROSSCHEX_API_SECRET', 'test-secret');
    vi.stubEnv('CROSSCHEX_API_BASE_URL', 'https://api.test/');
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('returns token and caches it', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce(mockAuthFetch());
    const svc = makeService();
    const token = await svc.authenticate();
    expect(token).toBe(MOCK_TOKEN);
    expect(svc.getStatus().tokenActivo).toBe(true);
  });

  it('throws when API_KEY is not configured', async () => {
    vi.stubEnv('CROSSCHEX_API_KEY', '');
    const svc = makeService();
    await expect(svc.authenticate()).rejects.toThrow('CROSSCHEX_API_KEY');
  });

  it('throws when CrossChex returns non-200 code', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: 401, data: {} }),
    });
    const svc = makeService();
    await expect(svc.authenticate()).rejects.toThrow('code 401');
  });

  it('throws when HTTP response is not ok', async () => {
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce({ ok: false, status: 503 });
    const svc = makeService();
    await expect(svc.authenticate()).rejects.toThrow('HTTP 503');
  });
});

// ─── getToken (cache) ─────────────────────────────────────────────────────────

describe('CrossChexService.getToken', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('CROSSCHEX_API_KEY', 'test-key');
    vi.stubEnv('CROSSCHEX_API_SECRET', 'test-secret');
    vi.stubEnv('CROSSCHEX_API_BASE_URL', 'https://api.test/');
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('re-uses cached token without calling fetch again', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(mockAuthFetch());
    const svc = makeService();
    await svc.getToken();
    await svc.getToken();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('re-authenticates when token is expired', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue(mockAuthFetch());
    const svc = makeService();
    // Set an expired token manually
    (svc as any).tokenCache = { token: 'old', expiresAt: new Date(Date.now() - 1000) };
    await svc.getToken();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

// ─── syncHistorico ────────────────────────────────────────────────────────────

describe('CrossChexService.syncHistorico', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('CROSSCHEX_API_KEY', 'test-key');
    vi.stubEnv('CROSSCHEX_API_SECRET', 'test-secret');
    vi.stubEnv('CROSSCHEX_API_BASE_URL', 'https://api.test/');
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('processes a single page with one record successfully', async () => {
    vi.spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce(mockAuthFetch())
      .mockResolvedValueOnce(mockRecordsFetch([makeRecord()]));

    mockPool.query
      .mockResolvedValueOnce({ rows: [] })                    // dup check
      .mockResolvedValueOnce({ rows: [{ id: 'col-uuid' }] }) // colaborador
      .mockResolvedValueOnce({ rows: [{ id: 'dev-uuid' }] }) // dispositivo
      .mockResolvedValueOnce({ rows: [] });                   // INSERT

    const svc = makeService();
    const result = await svc.syncHistorico('2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z');

    expect(result.total).toBe(1);
    expect(result.procesados).toBe(1);
    expect(result.duplicados).toBe(0);
    expect(result.fallidos).toBe(0);
  });

  it('marks duplicado when id_solicitud_externo already exists', async () => {
    vi.spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce(mockAuthFetch())
      .mockResolvedValueOnce(mockRecordsFetch([makeRecord()]));

    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] }); // dup found

    const svc = makeService();
    const result = await svc.syncHistorico('2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z');

    expect(result.duplicados).toBe(1);
    expect(result.procesados).toBe(0);
  });

  it('marks fallido when colaborador workno not registered', async () => {
    vi.spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce(mockAuthFetch())
      .mockResolvedValueOnce(mockRecordsFetch([makeRecord('9999')]));

    mockPool.query
      .mockResolvedValueOnce({ rows: [] })  // dup check
      .mockResolvedValueOnce({ rows: [] }); // colaborador not found

    const svc = makeService();
    const result = await svc.syncHistorico('2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z');

    expect(result.fallidos).toBe(1);
    expect(result.errores[0].motivo).toContain('colaborador no registrado');
  });

  it('paginates through multiple pages', async () => {
    const record1 = makeRecord('5001', 'SN001', '2026-05-01T08:00:00Z');
    const record2 = makeRecord('5002', 'SN001', '2026-05-02T08:00:00Z');

    vi.spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce(mockAuthFetch())
      .mockResolvedValueOnce(mockRecordsFetch([record1], 1, 2)) // page 1 of 2
      .mockResolvedValueOnce(mockRecordsFetch([record2], 2, 2)); // page 2 of 2

    mockPool.query
      // record1
      .mockResolvedValueOnce({ rows: [] })                    // dup
      .mockResolvedValueOnce({ rows: [{ id: 'col-1' }] })    // colaborador
      .mockResolvedValueOnce({ rows: [{ id: 'dev-1' }] })    // dispositivo
      .mockResolvedValueOnce({ rows: [] })                    // INSERT
      // record2
      .mockResolvedValueOnce({ rows: [] })                    // dup
      .mockResolvedValueOnce({ rows: [{ id: 'col-2' }] })    // colaborador
      .mockResolvedValueOnce({ rows: [{ id: 'dev-1' }] })    // dispositivo
      .mockResolvedValueOnce({ rows: [] });                   // INSERT

    const svc = makeService();
    const result = await svc.syncHistorico('2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z');

    expect(result.total).toBe(2);
    expect(result.procesados).toBe(2);
  });
});

// ─── getStatus ────────────────────────────────────────────────────────────────

describe('CrossChexService.getStatus', () => {
  it('reports no active token and missing credentials when not configured', () => {
    vi.stubEnv('CROSSCHEX_API_KEY', '');
    vi.stubEnv('CROSSCHEX_API_SECRET', '');
    const svc = makeService();
    const status = svc.getStatus();
    expect(status.tokenActivo).toBe(false);
    expect(status.apiKeyConfigurado).toBe(false);
    expect(status.apiSecretConfigurado).toBe(false);
  });

  it('reports configured when env vars are set', () => {
    vi.stubEnv('CROSSCHEX_API_KEY', 'key');
    vi.stubEnv('CROSSCHEX_API_SECRET', 'secret');
    const svc = makeService();
    const status = svc.getStatus();
    expect(status.apiKeyConfigurado).toBe(true);
    expect(status.apiSecretConfigurado).toBe(true);
  });
});
