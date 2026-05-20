import { describe, it, expect } from 'vitest';
import { parseCSV } from './csv-import.parser';

function makeCSV(rows: string[], header = 'No.,Employee ID,Employee Name,Department,Check Time,State,Device Name'): Buffer {
  return Buffer.from([header, ...rows].join('\n'));
}

const GOOD_ROW = '1,5001,Juan Pérez,Producción,2026-05-20T08:00:00Z,192,Reloj Principal';

describe('parseCSV', () => {
  it('parses a valid row correctly', () => {
    const result = parseCSV(makeCSV([GOOD_ROW]));
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.codigoEmpleado).toBe('5001');
    expect(row.verifyCode).toBe(192);
    expect(row.deviceName).toBe('Reloj Principal');
    expect(row.checkTime).toBeInstanceOf(Date);
    expect(isNaN(row.checkTime.getTime())).toBe(false);
  });

  it('generates deterministic id_solicitud_externo for same employee + time', () => {
    const result1 = parseCSV(makeCSV([GOOD_ROW]));
    const result2 = parseCSV(makeCSV([GOOD_ROW]));
    expect(result1.rows[0].idSolicitudExterno).toBe(result2.rows[0].idSolicitudExterno);
    expect(result1.rows[0].idSolicitudExterno).toMatch(/^csv-[0-9a-f]{16}$/);
  });

  it('generates different ids for different employees', () => {
    const row2 = '2,9999,Pedro Gómez,Logística,2026-05-20T08:00:00Z,192,Reloj Principal';
    const result = parseCSV(makeCSV([GOOD_ROW, row2]));
    expect(result.rows[0].idSolicitudExterno).not.toBe(result.rows[1].idSolicitudExterno);
  });

  it('generates different ids for same employee at different times', () => {
    const row2 = '2,5001,Juan Pérez,Producción,2026-05-20T17:00:00Z,192,Reloj Principal';
    const result = parseCSV(makeCSV([GOOD_ROW, row2]));
    expect(result.rows[0].idSolicitudExterno).not.toBe(result.rows[1].idSolicitudExterno);
  });

  it('reports error for missing Employee ID', () => {
    const row = '1,,Juan Pérez,Producción,2026-05-20T08:00:00Z,192,Reloj Principal';
    const result = parseCSV(makeCSV([row]));
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].fila).toBe(2);
    expect(result.errors[0].motivo).toContain('Employee ID');
  });

  it('reports error for invalid date', () => {
    const row = '1,5001,Juan Pérez,Producción,32/13/2026,192,Reloj Principal';
    const result = parseCSV(makeCSV([row]));
    expect(result.errors[0].motivo).toContain('fecha inválida');
  });

  it('reports error for missing Device Name', () => {
    const row = '1,5001,Juan Pérez,Producción,2026-05-20T08:00:00Z,192,';
    const result = parseCSV(makeCSV([row]));
    expect(result.errors[0].motivo).toContain('Device Name');
  });

  it('processes valid rows and collects errors independently', () => {
    const badRow = '2,,Missing Employee,Producción,2026-05-20T08:00:00Z,192,Reloj Principal';
    const result = parseCSV(makeCSV([GOOD_ROW, badRow]));
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });

  it('returns parse error for non-CSV content', () => {
    const result = parseCSV(Buffer.from('this is not csv at all \x00\x01\x02'));
    // Should not throw; returns errors
    expect(result).toHaveProperty('errors');
  });

  it('throws IMPORT_TOO_LARGE for more than 5000 rows', () => {
    const rows = Array.from({ length: 5001 }, (_, i) =>
      `${i + 1},${1000 + i},Name,Dept,2026-05-20T08:00:00Z,192,Reloj`,
    );
    expect(() => parseCSV(makeCSV(rows))).toThrow('IMPORT_TOO_LARGE');
  });

  it('accepts exactly 5000 rows without throwing', () => {
    const rows = Array.from({ length: 5000 }, (_, i) =>
      `${i + 1},${1000 + i},Name,Dept,2026-05-20T0${String(i % 24).padStart(2, '0')}:00:00Z,192,Reloj`,
    );
    expect(() => parseCSV(makeCSV(rows))).not.toThrow();
  });
});
