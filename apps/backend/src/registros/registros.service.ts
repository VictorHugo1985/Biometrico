import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../auth/database.token';

export interface RegistroRow {
  id:              string;
  colaborador:     { id: string; nombre: string; apellido: string };
  dispositivo:     { id: string; nombre: string } | null;
  hora_marcacion:  string;
  tipo_verificacion: string | null;
  origen:          string;
  estado:          string;
}

export interface RegistrosPage {
  data:        RegistroRow[];
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
}

export interface RegistroDetalle extends RegistroRow {
  payload_crudo: unknown;
  motivo_fallo:  string | null;
}

export interface RegistrosFiltros {
  colaborador_id?: string;
  desde?:          string;
  hasta?:          string;
  estado?:         string;
  origen?:         string;
  page?:           number;
  page_size?:      number;
}

@Injectable()
export class RegistrosService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async listar(filtros: RegistrosFiltros): Promise<RegistrosPage> {
    const page = Math.max(1, filtros.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, filtros.page_size ?? 50));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filtros.colaborador_id) {
      conditions.push(`eb.colaborador_id = $${idx++}`);
      params.push(filtros.colaborador_id);
    }
    if (filtros.desde) {
      conditions.push(`eb.hora_marcacion >= $${idx++}`);
      params.push(filtros.desde);
    }
    if (filtros.hasta) {
      conditions.push(`eb.hora_marcacion <= $${idx++}`);
      params.push(filtros.hasta);
    }
    // estado is derived from auditoria_webhooks; for simplicity filter by origen presence
    // The spec lists estado as procesado/fallido/duplicado from auditoria_webhooks
    // We join the latest auditoria entry per evento
    if (filtros.estado) {
      conditions.push(`aw.estado_procesamiento = $${idx++}`);
      params.push(filtros.estado);
    }
    if (filtros.origen) {
      conditions.push(`eb.origen = $${idx++}`);
      params.push(filtros.origen);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM eventos_biometricos eb
      LEFT JOIN LATERAL (
        SELECT estado_procesamiento
        FROM auditoria_webhooks
        WHERE evento_biometrico_id = eb.id
        ORDER BY recibido_en DESC
        LIMIT 1
      ) aw ON true
      ${where}
    `;

    const dataQuery = `
      SELECT
        eb.id,
        c.id   AS col_id,
        c.nombre   AS col_nombre,
        c.apellido AS col_apellido,
        d.id   AS dev_id,
        d.nombre AS dev_nombre,
        eb.hora_marcacion,
        tv.descripcion AS tipo_verificacion,
        eb.origen,
        COALESCE(aw.estado_procesamiento, 'procesado') AS estado
      FROM eventos_biometricos eb
      JOIN colaboradores c ON c.id = eb.colaborador_id
      LEFT JOIN dispositivos_biometricos d ON d.id = eb.dispositivo_id
      LEFT JOIN tipos_verificacion tv ON tv.codigo = eb.codigo_tipo_verificacion
      LEFT JOIN LATERAL (
        SELECT estado_procesamiento
        FROM auditoria_webhooks
        WHERE evento_biometrico_id = eb.id
        ORDER BY recibido_en DESC
        LIMIT 1
      ) aw ON true
      ${where}
      ORDER BY eb.hora_marcacion DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const [countResult, dataResult] = await Promise.all([
      this.pool.query<{ total: string }>(countQuery, params),
      this.pool.query(dataQuery, [...params, pageSize, offset]),
    ]);

    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    const data: RegistroRow[] = dataResult.rows.map((r) => ({
      id:              r.id,
      colaborador:     { id: r.col_id, nombre: r.col_nombre, apellido: r.col_apellido },
      dispositivo:     r.dev_id ? { id: r.dev_id, nombre: r.dev_nombre } : null,
      hora_marcacion:  r.hora_marcacion,
      tipo_verificacion: r.tipo_verificacion ?? null,
      origen:          r.origen,
      estado:          r.estado,
    }));

    return {
      data,
      total,
      page,
      page_size:   pageSize,
      total_pages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string): Promise<RegistroDetalle | null> {
    const result = await this.pool.query(
      `SELECT
         eb.id,
         c.id   AS col_id,
         c.nombre   AS col_nombre,
         c.apellido AS col_apellido,
         d.id   AS dev_id,
         d.nombre AS dev_nombre,
         eb.hora_marcacion,
         eb.origen,
         eb.payload_crudo,
         tv.descripcion AS tipo_verificacion,
         COALESCE(aw.estado_procesamiento, 'procesado') AS estado,
         aw.motivo_fallo
       FROM eventos_biometricos eb
       JOIN colaboradores c ON c.id = eb.colaborador_id
       LEFT JOIN dispositivos_biometricos d ON d.id = eb.dispositivo_id
       LEFT JOIN tipos_verificacion tv ON tv.codigo = eb.codigo_tipo_verificacion
       LEFT JOIN LATERAL (
         SELECT estado_procesamiento, motivo_fallo
         FROM auditoria_webhooks
         WHERE evento_biometrico_id = eb.id
         ORDER BY recibido_en DESC
         LIMIT 1
       ) aw ON true
       WHERE eb.id = $1`,
      [id],
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return {
      id:               r.id,
      colaborador:      { id: r.col_id, nombre: r.col_nombre, apellido: r.col_apellido },
      dispositivo:      r.dev_id ? { id: r.dev_id, nombre: r.dev_nombre } : null,
      hora_marcacion:   r.hora_marcacion,
      tipo_verificacion: r.tipo_verificacion ?? null,
      origen:           r.origen,
      estado:           r.estado,
      payload_crudo:    r.payload_crudo ?? null,
      motivo_fallo:     r.motivo_fallo ?? null,
    };
  }
}
