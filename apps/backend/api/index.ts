import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

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
