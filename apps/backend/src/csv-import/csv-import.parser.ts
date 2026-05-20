import { parse } from 'csv-parse/sync';
import * as crypto from 'crypto';

export interface ParsedCSVRow {
  codigoEmpleado:     string;
  checkTime:          Date;
  verifyCode:         number;
  deviceName:         string;
  idSolicitudExterno: string;
  rawRow:             Record<string, string>;
}

export interface ParseCSVError {
  fila:   number;
  motivo: string;
}

export interface ParseCSVResult {
  rows:   ParsedCSVRow[];
  errors: ParseCSVError[];
}

const MAX_ROWS = 5000;

// Expected CrossChex export columns:
// No., Employee ID, Employee Name, Department, Check Time, State, Device Name
export function parseCSV(buffer: Buffer): ParseCSVResult {
  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
  } catch {
    return {
      rows: [],
      errors: [{ fila: 0, motivo: 'Error al parsear el CSV: formato inválido' }],
    };
  }

  if (records.length > MAX_ROWS) {
    throw new Error('IMPORT_TOO_LARGE');
  }

  const rows: ParsedCSVRow[] = [];
  const errors: ParseCSVError[] = [];

  records.forEach((record, index) => {
    const fila = index + 2; // row 1 is header
    const employeeId = record['Employee ID']?.trim();
    const checkTimeStr = record['Check Time']?.trim();
    const stateStr = record['State']?.trim();
    const deviceName = record['Device Name']?.trim();

    if (!employeeId) {
      errors.push({ fila, motivo: 'Employee ID vacío' });
      return;
    }
    if (!checkTimeStr) {
      errors.push({ fila, motivo: 'Check Time vacío' });
      return;
    }
    if (!deviceName) {
      errors.push({ fila, motivo: 'Device Name vacío' });
      return;
    }

    const checkTime = new Date(checkTimeStr);
    if (isNaN(checkTime.getTime())) {
      errors.push({ fila, motivo: `fecha inválida: '${checkTimeStr}'` });
      return;
    }

    const verifyCode = stateStr !== undefined && stateStr !== '' ? parseInt(stateStr, 10) : 0;
    if (isNaN(verifyCode)) {
      errors.push({ fila, motivo: `código de verificación inválido: '${stateStr}'` });
      return;
    }

    const hash = crypto
      .createHash('sha256')
      .update(`${employeeId}|${checkTime.toISOString()}`)
      .digest('hex')
      .substring(0, 16);

    rows.push({
      codigoEmpleado:     employeeId,
      checkTime,
      verifyCode,
      deviceName,
      idSolicitudExterno: `csv-${hash}`,
      rawRow:             record,
    });
  });

  return { rows, errors };
}
