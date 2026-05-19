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
        aw.id,
        aw.id_solicitud_crosschex,
        aw.recibido_en AT TIME ZONE 'America/Bogota' AS recibido_cot,
        aw.cabeceras,
        aw.payload,
        aw.firma_valida,
        aw.estado_procesamiento,
        aw.notas_procesamiento,
        c.nombre   AS colaborador_nombre,
        c.apellido AS colaborador_apellido,
        c.codigo_empleado
      FROM auditoria_webhooks aw
      LEFT JOIN eventos_biometricos eb ON eb.id = aw.evento_biometrico_id
      LEFT JOIN colaboradores c ON c.id = eb.colaborador_id
      ORDER BY aw.recibido_en DESC
      LIMIT 50
    `);
    rows = result.rows;
  } catch (e) {
    dbError = (e as Error).message;
  }

  const badge = (estado: string) => {
    const map: Record<string, string> = {
      procesado: '#16a34a',
      rechazado: '#dc2626',
      fallido:   '#d97706',
      duplicado: '#6366f1',
    };
    return `background:${map[estado] ?? '#6b7280'}`;
  };

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString('es', { timeZone: 'America/Bogota', hour12: false });

  const getEmployee = (r: any) => {
    if (r.colaborador_nombre) return `${r.colaborador_nombre} ${r.colaborador_apellido}`;
    const records = r.payload?.records;
    if (records?.[0]?.employee?.workno) return `workno: ${records[0].employee.workno}`;
    return '—';
  };

  const rows_html = rows.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:2rem">
        ${dbError ? '⚠ ' + dbError : 'Sin eventos registrados aún.'}
       </td></tr>`
    : rows.map(r => {
        const records  = r.payload?.records ?? [];
        const checkTime = records[0]?.check_time
          ? fmtTime(records[0].check_time)
          : fmtTime(r.recibido_cot);
        const nota = r.notas_procesamiento
          ? `<br><span style="color:#f87171;font-size:0.7rem">${r.notas_procesamiento}</span>`
          : '';
        return `
        <tr>
          <td style="color:#9ca3af;white-space:nowrap">${checkTime}</td>
          <td>${getEmployee(r)}</td>
          <td style="font-family:monospace;font-size:0.7rem;color:#6b7280">${(r.id_solicitud_crosschex ?? '—').slice(0, 16)}</td>
          <td style="text-align:center">${r.firma_valida ? '✅' : '❌'}</td>
          <td>
            <span style="padding:2px 10px;border-radius:9999px;font-size:0.75rem;color:#fff;${badge(r.estado_procesamiento)}">${r.estado_procesamiento}</span>
            ${nota}
          </td>
          <td style="font-size:0.75rem;color:#9ca3af">${records.length > 0 ? records.length + ' marca(s)' : '—'}</td>
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
    header h1{font-size:1.25rem;font-weight:700;color:#f8fafc}
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
  </style>
</head>
<body>
<header>
  <h1>☁ <span>Biometrico</span> — Panel de Webhooks</h1>
  <div class="meta">
    <strong>${rows.length}</strong> eventos · actualiza cada 30s
    &nbsp;·&nbsp; ${new Date().toLocaleString('es', { timeZone: 'America/Bogota', hour12: false })}
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
          <th>Hora marcación (COT)</th>
          <th>Colaborador</th>
          <th>Request ID</th>
          <th>Firma</th>
          <th>Estado</th>
          <th>Registros</th>
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
  const headers  = req.headers as Record<string, string>;
  const requestId = headers['requestid'];
  const secret    = process.env.CROSSCHEX_WEBHOOK_SECRET;
  const firmaValida = !secret || headers['authorize-sign'] === secret;

  const records: any[] = req.body?.records ?? [];
  console.log(`Webhook | requestId: ${requestId} | records: ${records.length} | firma: ${firmaValida}`);

  // 1. Registrar en auditoria siempre
  let auditId: string | null = null;
  try {
    const r = await pool.query(
      `INSERT INTO auditoria_webhooks
         (id_solicitud_crosschex, recibido_en, cabeceras, payload, firma_valida, estado_procesamiento)
       VALUES ($1, NOW(), $2, $3, $4, $5) RETURNING id`,
      [requestId ?? null, JSON.stringify(headers), JSON.stringify(req.body), firmaValida,
       firmaValida ? 'procesado' : 'rechazado'],
    );
    auditId = r.rows[0]?.id;
  } catch (e) {
    console.error('auditoria error:', (e as Error).message);
  }

  // 2. Procesar cada marcación si la firma es válida
  if (firmaValida && records.length > 0) {
    for (const record of records) {
      const { uuid, check_time, check_type, device, employee } = record;
      try {
        // Buscar colaborador y dispositivo
        const [colRes, devRes] = await Promise.all([
          pool.query('SELECT id FROM colaboradores WHERE codigo_empleado = $1', [employee?.workno]),
          pool.query('SELECT id FROM dispositivos_biometricos WHERE numero_serie = $1', [device?.serial_number]),
        ]);

        if (colRes.rows.length === 0 || devRes.rows.length === 0) {
          const nota = `Entidad no registrada — workno: ${employee?.workno}, serie: ${device?.serial_number}`;
          console.warn(nota);
          if (auditId) {
            await pool.query(
              `UPDATE auditoria_webhooks
               SET estado_procesamiento = 'fallido', notas_procesamiento = $1
               WHERE id = $2`,
              [nota, auditId],
            );
          }
          continue;
        }

        // Insertar evento biométrico (idempotente por uuid)
        const evRes = await pool.query(
          `INSERT INTO eventos_biometricos
             (id_solicitud_externo, colaborador_id, dispositivo_id,
              codigo_tipo_verificacion, hora_marcacion, origen, payload_crudo)
           VALUES ($1, $2, $3, $4, $5, 'webhook', $6)
           ON CONFLICT (id_solicitud_externo) DO NOTHING
           RETURNING id`,
          [uuid, colRes.rows[0].id, devRes.rows[0].id,
           check_type, check_time, JSON.stringify(record)],
        );

        const eventoId = evRes.rows[0]?.id ?? null;
        if (auditId && eventoId) {
          await pool.query(
            'UPDATE auditoria_webhooks SET evento_biometrico_id = $1 WHERE id = $2',
            [eventoId, auditId],
          );
        }
        console.log(`Evento registrado | workno: ${employee?.workno} | ${check_time}`);
      } catch (e) {
        console.error('Error procesando record:', (e as Error).message);
      }
    }
  }

  res.status(200).json({ code: '200', msg: 'success' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
