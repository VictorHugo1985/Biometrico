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
  let eventos: any[] = [];
  let audit: any[] = [];
  let dbError = '';

  try {
    const [evRes, awRes] = await Promise.all([
      pool.query(`
        SELECT
          eb.id,
          eb.hora_marcacion AT TIME ZONE 'America/Bogota' AS hora_cot,
          COALESCE(tv.descripcion, 'Tipo ' || eb.codigo_tipo_verificacion) AS tipo_verificacion,
          c.nombre           AS colaborador_nombre,
          c.apellido         AS colaborador_apellido,
          c.codigo_empleado  AS workno,
          d.nombre           AS dispositivo,
          d.ubicacion        AS ubicacion,
          eb.origen
        FROM eventos_biometricos eb
        JOIN  colaboradores          c  ON c.id  = eb.colaborador_id
        JOIN  dispositivos_biometricos d ON d.id = eb.dispositivo_id
        LEFT JOIN tipos_verificacion tv ON tv.codigo = eb.codigo_tipo_verificacion
        ORDER BY eb.hora_marcacion DESC
        LIMIT 50
      `),
      pool.query(`
        SELECT
          aw.id_solicitud_crosschex,
          aw.recibido_en AT TIME ZONE 'America/Bogota' AS recibido_cot,
          aw.firma_valida,
          aw.estado_procesamiento,
          aw.notas_procesamiento,
          aw.payload
        FROM auditoria_webhooks aw
        ORDER BY aw.recibido_en DESC
        LIMIT 30
      `),
    ]);
    eventos = evRes.rows;
    audit   = awRes.rows;
  } catch (e) {
    dbError = (e as Error).message;
  }

  const fmtTime = (ts: string) =>
    new Date(ts).toLocaleString('es', { timeZone: 'America/Bogota', hour12: false });

  const badgeCss = (estado: string) => {
    const map: Record<string, string> = {
      procesado: '#16a34a', rechazado: '#dc2626',
      fallido: '#d97706',   duplicado: '#6366f1',
    };
    return `background:${map[estado] ?? '#6b7280'}`;
  };

  const origenBadge = (origen: string) =>
    origen === 'webhook'
      ? `<span style="font-size:0.65rem;padding:1px 7px;border-radius:9999px;background:#0ea5e9;color:#fff">webhook</span>`
      : `<span style="font-size:0.65rem;padding:1px 7px;border-radius:9999px;background:#8b5cf6;color:#fff">csv</span>`;

  const eventosHtml = eventos.length === 0
    ? `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:2rem">
        ${dbError ? '⚠ ' + dbError : 'Sin eventos procesados aún.'}
       </td></tr>`
    : eventos.map(r => `
      <tr>
        <td style="white-space:nowrap;color:#94a3b8">${fmtTime(r.hora_cot)}</td>
        <td>
          <span style="color:#f1f5f9;font-weight:600">${r.colaborador_nombre} ${r.colaborador_apellido}</span>
          <br><span style="font-size:0.7rem;color:#64748b">workno: ${r.workno}</span>
        </td>
        <td style="font-size:0.8rem;color:#94a3b8">${r.tipo_verificacion}</td>
        <td style="font-size:0.8rem;color:#94a3b8">
          ${r.dispositivo}
          ${r.ubicacion ? `<br><span style="font-size:0.65rem;color:#64748b">${r.ubicacion}</span>` : ''}
        </td>
        <td>${origenBadge(r.origen)}</td>
      </tr>`).join('');

  const auditHtml = audit.map(r => {
    const records = r.payload?.records ?? [];
    const nota = r.notas_procesamiento
      ? `<br><span style="color:#f87171;font-size:0.65rem">${r.notas_procesamiento}</span>` : '';
    return `
      <tr>
        <td style="color:#64748b;white-space:nowrap;font-size:0.75rem">${fmtTime(r.recibido_cot)}</td>
        <td style="font-family:monospace;font-size:0.65rem;color:#6b7280">${(r.id_solicitud_crosschex ?? '—').slice(0, 20)}</td>
        <td style="text-align:center;font-size:0.8rem">${r.firma_valida ? '✅' : '❌'}</td>
        <td>
          <span style="padding:1px 8px;border-radius:9999px;font-size:0.7rem;color:#fff;${badgeCss(r.estado_procesamiento)}">${r.estado_procesamiento}</span>
          ${nota}
        </td>
        <td style="font-size:0.7rem;color:#64748b">${records.length > 0 ? records.length + ' reg.' : '—'}</td>
      </tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:1rem">Sin registros de auditoría.</td></tr>`;

  const now = new Date().toLocaleString('es', { timeZone: 'America/Bogota', hour12: false });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="30">
  <title>Biometrico — Dashboard</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;min-height:100vh}
    header{background:#1e293b;border-bottom:1px solid #334155;padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
    header h1{font-size:1.1rem;font-weight:700;color:#f8fafc}
    header h1 span{color:#38bdf8}
    .meta{font-size:0.75rem;color:#64748b}
    .meta strong{color:#94a3b8}
    main{padding:1.5rem 2rem;display:flex;flex-direction:column;gap:1.5rem}
    .card{background:#1e293b;border:1px solid #334155;border-radius:0.75rem;overflow:hidden}
    .card-header{padding:.875rem 1.5rem;border-bottom:1px solid #334155;display:flex;align-items:center;gap:.5rem}
    .card-header h2{font-size:0.8rem;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;flex:1}
    .card-header .count{font-size:0.75rem;color:#64748b}
    .dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite;flex-shrink:0}
    .dot-dim{background:#475569;animation:none}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    table{width:100%;border-collapse:collapse;font-size:0.85rem}
    th{padding:.6rem 1rem;text-align:left;font-size:0.65rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #334155;white-space:nowrap}
    td{padding:.65rem 1rem;border-bottom:1px solid #1e293b;vertical-align:middle}
    tr:hover td{background:#0f172a}
    tr:last-child td{border-bottom:none}
  </style>
</head>
<body>
<header>
  <h1>☁ <span>Biometrico</span></h1>
  <div class="meta">actualiza cada 30 s &nbsp;·&nbsp; <strong>${now}</strong></div>
</header>
<main>

  <div class="card">
    <div class="card-header">
      <div class="dot"></div>
      <h2>Registros Biométricos</h2>
      <span class="count">${eventos.length} eventos</span>
    </div>
    <table>
      <thead><tr>
        <th>Hora (COT)</th>
        <th>Colaborador</th>
        <th>Verificación</th>
        <th>Dispositivo</th>
        <th>Origen</th>
      </tr></thead>
      <tbody>${eventosHtml}</tbody>
    </table>
  </div>

  <div class="card">
    <div class="card-header">
      <div class="dot dot-dim"></div>
      <h2>Auditoría Webhooks</h2>
      <span class="count">${audit.length} entradas</span>
    </div>
    <table>
      <thead><tr>
        <th>Recibido (COT)</th>
        <th>Request ID</th>
        <th>Firma</th>
        <th>Estado</th>
        <th>Regs.</th>
      </tr></thead>
      <tbody>${auditHtml}</tbody>
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
