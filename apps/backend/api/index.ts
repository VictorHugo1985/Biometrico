import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

// ── Dashboard principal ────────────────────────────────────────────────────────
app.get('/', async (_req: Request, res: Response) => {
  let rows: any[] = [];
  let dbError = '';

  try {
    const result = await pool.query(`
      SELECT
        id,
        id_solicitud_crosschex,
        recibido_en,
        cabeceras,
        payload,
        firma_valida,
        estado_procesamiento,
        notas_procesamiento
      FROM auditoria_webhooks
      ORDER BY recibido_en DESC
      LIMIT 50
    `);
    rows = result.rows;
  } catch (e) {
    dbError = (e as Error).message;
  }

  const badge = (estado: string) => {
    const map: Record<string, string> = {
      procesado:  '#16a34a',
      rechazado:  '#dc2626',
      fallido:    '#d97706',
      duplicado:  '#6366f1',
    };
    return `background:${map[estado] ?? '#6b7280'}`;
  };

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString('es', { timeZone: 'America/Bogota', hour12: false });

  const rows_html = rows.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:2rem">
        ${dbError ? '⚠ ' + dbError : 'Sin eventos registrados aún.'}
       </td></tr>`
    : rows.map(r => {
        const headers = r.cabeceras ?? {};
        const ns      = headers['namespace'] ?? headers['nameSpace'] ?? '—';
        const action  = headers['nameaction'] ?? headers['nameAction'] ?? '—';
        const payload = r.payload ? JSON.stringify(r.payload).slice(0, 80) + '…' : '—';
        const reqId   = r.id_solicitud_crosschex ?? '—';
        return `
        <tr>
          <td style="color:#9ca3af;white-space:nowrap">${fmtTime(r.recibido_en)}</td>
          <td style="font-family:monospace;font-size:0.75rem;color:#d1d5db">${reqId.slice(0, 18)}…</td>
          <td>${ns}<br><span style="color:#6b7280;font-size:0.7rem">${action}</span></td>
          <td style="text-align:center">${r.firma_valida ? '✅' : '❌'}</td>
          <td><span style="padding:2px 10px;border-radius:9999px;font-size:0.75rem;color:#fff;${badge(r.estado_procesamiento)}">${r.estado_procesamiento}</span></td>
          <td style="font-size:0.75rem;color:#9ca3af;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.payload ? JSON.stringify(r.payload) : ''}">${payload}</td>
        </tr>`;
      }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="30">
  <title>Biometrico — Webhooks</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;min-height:100vh}
    header{background:#1e293b;border-bottom:1px solid #334155;padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between}
    header h1{font-size:1.25rem;font-weight:700;color:#f8fafc;letter-spacing:-.01em}
    header h1 span{color:#38bdf8}
    .meta{font-size:0.75rem;color:#64748b}
    .meta strong{color:#94a3b8}
    main{padding:2rem}
    .card{background:#1e293b;border:1px solid #334155;border-radius:0.75rem;overflow:hidden}
    .card-header{padding:1rem 1.5rem;border-bottom:1px solid #334155;display:flex;align-items:center;gap:0.5rem}
    .card-header h2{font-size:0.875rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
    .dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    table{width:100%;border-collapse:collapse;font-size:0.875rem}
    th{padding:.75rem 1rem;text-align:left;font-size:0.7rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #334155;white-space:nowrap}
    td{padding:.75rem 1rem;border-bottom:1px solid #1e293b;vertical-align:top}
    tr:hover td{background:#0f172a}
    tr:last-child td{border-bottom:none}
    .refresh{font-size:0.7rem;color:#475569}
  </style>
</head>
<body>
<header>
  <h1>☁ <span>Biometrico</span> — Panel de Webhooks</h1>
  <div class="meta">
    <strong>${rows.length}</strong> eventos · actualiza cada 30s
    &nbsp;·&nbsp; <span class="refresh">${new Date().toLocaleString('es', { timeZone: 'America/Bogota', hour12: false })}</span>
  </div>
</header>
<main>
  <div class="card">
    <div class="card-header">
      <div class="dot"></div>
      <h2>Últimos eventos CrossChex</h2>
    </div>
    <table>
      <thead>
        <tr>
          <th>Recibido (COT)</th>
          <th>Request ID</th>
          <th>Namespace / Acción</th>
          <th>Firma</th>
          <th>Estado</th>
          <th>Payload</th>
        </tr>
      </thead>
      <tbody>${rows_html}</tbody>
    </table>
  </div>
</main>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});

// ── Webhook CrossChex ──────────────────────────────────────────────────────────
app.post('/webhooks/crosschex', async (req: Request, res: Response) => {
  const headers = req.headers as Record<string, string>;
  const requestId = headers['requestid'];
  const authorizeSign = headers['authorize-sign'];
  const secret = process.env.CROSSCHEX_WEBHOOK_SECRET;
  const firmaValida = !secret || authorizeSign === secret;

  console.log(`Webhook | requestId: ${requestId} | firma: ${firmaValida}`);

  try {
    await pool.query(
      `INSERT INTO auditoria_webhooks
         (id_solicitud_crosschex, recibido_en, cabeceras, payload, firma_valida, estado_procesamiento)
       VALUES ($1, NOW(), $2, $3, $4, $5)`,
      [
        requestId ?? null,
        JSON.stringify(headers),
        req.body ? JSON.stringify(req.body) : null,
        firmaValida,
        firmaValida ? 'procesado' : 'rechazado',
      ],
    );
  } catch (e) {
    console.error('DB error:', (e as Error).message);
  }

  res.status(200).json({ code: '200', msg: 'success' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
